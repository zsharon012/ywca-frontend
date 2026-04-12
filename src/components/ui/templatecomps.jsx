import React, { useState, useEffect } from 'react';
import {
  Button,
  TextField,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  Box,
  Typography,
  Stack,
  MenuItem,
  Select,
} from '@mui/material';

import { VariablePicker } from './VariableExtension';

import {
  FormatBold,
  FormatItalic,
  FormatStrikethrough,
  Link as LinkIcon,
  Image as ImageIcon,
} from '@mui/icons-material';

export const Sidebar = ({ children }) => (
  <Paper elevation={1} sx={{ width: 280, p: 2, height: '100vh', overflow: 'auto' }}>
    {children}
  </Paper>
);

export const Main = ({ children }) => (
  <Box sx={{ flex: 1, p: 3, bgcolor: '#f9fafb', height: '100vh', overflow: 'auto' }}>
    {children}
  </Box>
);





const PRESETS = ['12', '14', '16', '18', '24', '32', '48'];

export const FontSizeControl = ({ editor }) => {
  const [value, setValue] = useState(''); // The value the Select displays
  const [inputValue, setInputValue] = useState(''); // The value the TextField displays

  if (!editor) return null;

  useEffect(() => {
    const update = () => {
      const size = editor.getAttributes('textStyle').fontSize?.replace('px', '') || '';
      setValue(size);
      setInputValue(size); // Sync input with editor selection
    };

    editor.on('selectionUpdate', update);
    update();

    return () => editor.off('selectionUpdate', update);
  }, [editor]);

  const apply = (val) => {
    const numericValue = val.replace(/[^0-9]/g, ''); // Ensure only numbers
    if (!numericValue) {
      editor.chain().focus().unsetFontSize().run();
      return;
    }
    editor.chain().focus().setFontSize(`${numericValue}px`).run();
    setValue(numericValue); // Update the dropdown label
  };

  return (
    <Select
      size="small"
      value={PRESETS.includes(value) ? value : ""} // Only show preset value in label if it matches
      displayEmpty
      sx={{ minWidth: 140 }}
      onChange={(e) => apply(e.target.value)}
    >
      <MenuItem value="">Font size</MenuItem>

      {PRESETS.map((s) => (
        <MenuItem key={s} value={s}>
          {s}px
        </MenuItem>
      ))}

      <MenuItem 
        disableRipple 
        onKeyDown={(e) => e.stopPropagation()} // 1. CRITICAL: Stops Select from "hearing" your typing
      >
        <Box
          sx={{ display: 'flex', gap: 1, width: '100%' }}
          onClick={(e) => e.stopPropagation()}
        >
          <TextField
            size="small"
            fullWidth
            placeholder="Custom"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)} // 2. Update local state only
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

export const TemplateList = ({ templates, selected, onSelect }) => (
  <List>
    {templates.map((t) => (
      <ListItemButton
        key={t.templateid}
        selected={selected?.templateid === t.templateid}
        onClick={() => onSelect(t)}
        sx={{ borderRadius: 1, mb: 0.5 }}
      >
        <ListItemText primary={t.name || '(no name)'} />
      </ListItemButton>
    ))}
  </List>
);

export const FormInputs = ({ name, setName, subject, setSubject }) => (
  <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
    <TextField
      label="Template Name"
      value={name}
      onChange={(e) => setName(e.target.value)}
      fullWidth
    />
    <TextField
      label="Subject"
      value={subject}
      onChange={(e) => setSubject(e.target.value)}
      fullWidth
    />
  </Stack>
);




export const ActionButtons = ({ onSave, onDelete, saving, disableDelete }) => (
  <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
    <Button variant="contained" color="success" onClick={onSave} disabled={saving}>
      {saving ? 'Saving...' : 'Save'}
    </Button>
    <Button variant="contained" color="error" onClick={onDelete} disabled={disableDelete}>
      Delete
    </Button>
  </Stack>
);

export const EditorToolbar = ({ editor }) => {
  if (!editor) return null;

  const button = (icon, action, active = false) => (
    <Button size="small" variant={active ? 'contained' : 'outlined'} onClick={action}>
      {icon}
    </Button>
  );

  return (
    <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap', alignItems: 'center' }}>


      {button(<FormatBold />, () =>
        editor.chain().focus().toggleBold().run(),
        editor.isActive('bold')
      )}

      {button(<FormatItalic />, () =>
        editor.chain().focus().toggleItalic().run(),
        editor.isActive('italic')
      )}

      {button(<FormatStrikethrough />, () =>
        editor.chain().focus().toggleStrike().run(),
        editor.isActive('strike')
      )}

      {button(<LinkIcon />, () => {
        const url = prompt('Enter URL');
        if (url) editor.chain().focus().setLink({ href: url }).run();
      })}

      {button(<ImageIcon />, () => {
        const url = prompt('Image URL');
        if (url) editor.chain().focus().setImage({ src: url }).run();
      })}
      <FontSizeControl editor={editor} />
      <VariablePicker editor={editor} />
    </Stack>
  );
};

export const EditorContainer = ({ children }) => (
  <Paper sx={{ p: 2, minHeight: 200 }}>
    {children}
  </Paper>
);