import React, { useState, useEffect, useRef } from 'react';
import { getAuth } from 'firebase/auth';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import { TextStyle } from '@tiptap/extension-text-style';
import {
  Typography,
  Button,
  TextField,
  Box,
  Paper,
  Stack,
  Select,
  MenuItem,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from '@mui/material';
import {
  FormatBold,
  FormatItalic,
  FormatStrikethrough,
  Link as LinkIcon,
  Image as ImageIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

// Custom Extensions and UI components
import { VariableExtension, VariablePicker } from '@/components/ui/VariableExtension.jsx';
import { FontSize } from '@/components/ui/FontSize.jsx';

// --- Sub-Components (Layout) ---

const Sidebar = ({ children }) => (
  <Paper elevation={0} sx={{ width: 300, p: 2, height: '100vh', overflow: 'auto', borderRight: '1px solid #e0e0e0', borderRadius: 0 }}>
    {children}
  </Paper>
);

const Main = ({ children }) => (
  <Box sx={{ flex: 1, p: 4, bgcolor: '#f9fafb', height: '100vh', overflow: 'auto' }}>
    {children}
  </Box>
);

const PRESETS = ['12', '14', '16', '18', '24', '32', '48'];

// --- Sub-Components (Editor Controls) ---

const FontSizeControl = ({ editor }) => {
  const [value, setValue] = useState('');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const size = editor.getAttributes('textStyle').fontSize?.replace('px', '') || '';
      setValue(size);
      setInputValue(size);
    };
    editor.on('selectionUpdate', update);
    update();
    return () => editor.off('selectionUpdate', update);
  }, [editor]);

  const apply = (val) => {
    const numeric = val.replace(/[^0-9]/g, '');
    if (!numeric) {
      editor.chain().focus().unsetFontSize().run();
      return;
    }
    editor.chain().focus().setFontSize(`${numeric}px`).run();
    setValue(numeric);
  };

  if (!editor) return null;

  return (
    <Select
      size="small"
      value={PRESETS.includes(value) ? value : ''}
      displayEmpty
      sx={{ minWidth: 100, bgcolor: 'white' }}
      onChange={(e) => apply(e.target.value)}
    >
      <MenuItem value="">Size</MenuItem>
      {PRESETS.map((s) => (
        <MenuItem key={s} value={s}>{s}px</MenuItem>
      ))}
      <MenuItem disableRipple onKeyDown={(e) => e.stopPropagation()}>
        <Box sx={{ px: 1, py: 0.5 }}>
          <TextField
            size="small"
            placeholder="Custom"
            value={inputValue}
            autoFocus
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                apply(inputValue);
                e.target.blur();
              }
            }}
          />
        </Box>
      </MenuItem>
    </Select>
  );
};

const EditorToolbar = ({ editor }) => {
  if (!editor) return null;

  const btn = (icon, action, active = false) => (
    <IconButton 
      size="small" 
      onClick={action} 
      color={active ? 'primary' : 'default'}
      sx={{ 
        border: '1px solid #e0e0e0', 
        borderRadius: 1, 
        bgcolor: active ? '#e3f2fd' : 'white',
        '&:hover': { bgcolor: active ? '#bbdefb' : '#f5f5f5' }
      }}
    >
      {icon}
    </IconButton>
  );

  return (
    <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
      <FontSizeControl editor={editor} />
      {btn(<FormatBold />, () => editor.chain().focus().toggleBold().run(), editor.isActive('bold'))}
      {btn(<FormatItalic />, () => editor.chain().focus().toggleItalic().run(), editor.isActive('italic'))}
      {btn(<FormatStrikethrough />, () => editor.chain().focus().toggleStrike().run(), editor.isActive('strike'))}
      {btn(<LinkIcon />, () => {
        const url = prompt('Enter URL:');
        if (url) editor.chain().focus().setLink({ href: url }).run();
      })}
      {btn(<ImageIcon />, () => {
        const url = prompt('Enter Image URL:');
        if (url) editor.chain().focus().setImage({ src: url }).run();
      })}
      <VariablePicker editor={editor} />
    </Stack>
  );
};

// --- Main Page Component ---

const DraftTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [filteredTemplates, setFilteredTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lastSavedTime, setLastSavedTime] = useState(null);
  
  const lastSavedRef = useRef('');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      TextStyle,
      FontSize,
      Link.configure({ openOnClick: true }),
      Image,
      VariableExtension,
    ],
    content: '',
  });

  const formatTime = (date) => {
    if (!date) return '';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return;
      
      const token = await user.getIdToken();
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      const list = Array.isArray(data) ? data : data.data || [];
      setTemplates(list);
      setFilteredTemplates(list);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFilteredTemplates(
      templates.filter(t => 
        (t.name || '').toLowerCase().includes(q) || 
        (t.subject || '').toLowerCase().includes(q)
      )
    );
  }, [search, templates]);

  // Autosave Heartbeat
  useEffect(() => {
    const interval = setInterval(() => {
      if (!selected?.templateid || !editor) return;

      const currentContent = editor.getHTML();
      const currentHash = `${name}|${subject}|${currentContent}`;

      if (currentHash !== lastSavedRef.current && !saving) {
        saveTemplate(true);
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [name, subject, selected, editor, saving]);

  const selectTemplate = (t) => {
    setSelected(t);
    setName(t.name || '');
    setSubject(t.subject || '');
    editor?.commands.setContent(t.body || '');
    lastSavedRef.current = `${t.name}|${t.subject}|${t.body}`;
    setLastSavedTime(null); // Reset visual saved time until first save in this session
  };

  const createNew = () => {
    setSelected(null);
    setName('');
    setSubject('');
    editor?.commands.setContent('');
    lastSavedRef.current = '';
    setLastSavedTime(null);
  };

  const saveTemplate = async (isAutosave = false) => {
    if (!isAutosave) setSaving(true);
    const body = editor.getHTML();

    try {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) throw new Error("No user authenticated");

      const token = await user.getIdToken();
      const payload = { name, subject, body };
      
      const isUpdate = !!(selected && selected.templateid);
      const url = isUpdate 
        ? `${import.meta.env.VITE_BACKEND_URL}/templates/${selected.templateid}`
        : `${import.meta.env.VITE_BACKEND_URL}/templates`;

      const res = await fetch(url, {
        method: isUpdate ? 'PUT' : 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(isUpdate ? payload : { ...payload, customname: true }),
      });

      if (res.ok) {
        setLastSavedTime(new Date());
        lastSavedRef.current = `${name}|${subject}|${body}`;
        if (!isUpdate) {
            // Re-fetch to get the new ID for the sidebar and selection
            await fetchTemplates();
        }
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  };

  const deleteTemplate = async () => {
    if (!selected?.templateid) return;
    try {
      const auth = getAuth();
      const user = auth.currentUser;
      const token = await user.getIdToken();
      
      const res = await fetch(`${import.meta.env.VITE_BACKEND_URL}/templates/${selected.templateid}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        createNew();
        await fetchTemplates();
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Sidebar>
        <Typography variant="h6" sx={{ mb: 2, fontWeight: 700, color: '#1a2027' }}>Templates</Typography>
        <Button 
            fullWidth 
            variant="contained" 
            onClick={createNew} 
            sx={{ mb: 3, py: 1, textTransform: 'none', fontWeight: 600 }}
        >
            + New Template
        </Button>
        <TextField
          size="small"
          fullWidth
          placeholder="Search saved templates..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 3, bgcolor: 'white' }}
        />
        <Stack spacing={1}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            filteredTemplates.map((t) => (
              <Paper
                key={t.templateid}
                elevation={0}
                onClick={() => selectTemplate(t)}
                sx={{
                  p: 1.5,
                  cursor: 'pointer',
                  border: selected?.templateid === t.templateid ? '2px solid #1976d2' : '1px solid #e0e0e0',
                  bgcolor: selected?.templateid === t.templateid ? '#e3f2fd' : 'white',
                  transition: '0.2s',
                  '&:hover': { bgcolor: selected?.templateid === t.templateid ? '#e3f2fd' : '#f5f5f5' }
                }}
              >
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 600 }}>{t.name || 'Untitled Template'}</Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {t.subject || 'No subject line'}
                </Typography>
              </Paper>
            ))
          )}
          {!loading && filteredTemplates.length === 0 && (
            <Typography variant="body2" sx={{ textAlign: 'center', mt: 2, color: 'text.secondary' }}>
              No templates found.
            </Typography>
          )}
        </Stack>
      </Sidebar>

      <Main>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, pb: 2, borderBottom: '1px solid #e0e0e0' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1a2027' }}>
              {selected ? 'Edit Template' : 'Create New Template'}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 0.5, 
                mt: 0.5, 
                color: lastSavedTime ? 'success.main' : 'text.secondary',
                fontWeight: lastSavedTime ? 600 : 400 
              }}
            >
              <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: lastSavedTime ? 'success.main' : '#ccc' }} />
              {lastSavedTime ? `Autosaved at ${formatTime(lastSavedTime)}` : 'Draft unsaved'}
            </Typography>
          </Box>
          {selected && (
            <Button 
                variant="outlined" 
                color="error" 
                size="small"
                startIcon={<DeleteIcon />}
                onClick={() => setDeleteDialogOpen(true)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Delete Template
            </Button>
          )}
        </Box>

        <Stack spacing={2} sx={{ mb: 4 }}>
          <TextField 
            label="Internal Template Name" 
            fullWidth 
            value={name} 
            onChange={e => setName(e.target.value)} 
            placeholder="e.g., Welcome Email v2"
            sx={{ bgcolor: 'white' }}
          />
          <TextField 
            label="Email Subject Line" 
            fullWidth 
            value={subject} 
            onChange={e => setSubject(e.target.value)} 
            placeholder="e.g., Welcome to our platform!"
            sx={{ bgcolor: 'white' }}
          />
        </Stack>

        <EditorToolbar editor={editor} />

        <Paper 
          variant="outlined" 
          sx={{ 
            p: 2, 
            minHeight: 450, 
            mb: 4, 
            bgcolor: 'white',
            '& .ProseMirror': { minHeight: 430, outline: 'none' } 
          }}
        >
          <EditorContent editor={editor} />
        </Paper>

        <Stack direction="row" spacing={2} alignItems="center">
          <Button 
            variant="contained" 
            color="success" 
            size="large" 
            onClick={() => saveTemplate(false)} 
            disabled={saving}
            sx={{ px: 4, py: 1.2, fontWeight: 700, textTransform: 'none' }}
          >
            {saving ? <CircularProgress size={24} color="inherit" /> : 'Save Template'}
          </Button>
          {saving && (
            <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
              Saving...
            </Typography>
          )}
        </Stack>
      </Main>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 700 }}>Delete Template?</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete <strong>{name || 'this template'}</strong>? 
            This action cannot be undone and will remove it from all draft lists.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ fontWeight: 600 }}>Cancel</Button>
          <Button 
            variant="contained" 
            color="error" 
            onClick={() => { deleteTemplate(); setDeleteDialogOpen(false); }}
            sx={{ fontWeight: 600 }}
          >
            Delete Permanently
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DraftTemplates;