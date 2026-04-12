import { Node, mergeAttributes } from '@tiptap/core';
export const VariableExtension = Node.create({
  name: 'variable',

  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      label: {
        default: 'variable',
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-variable]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-variable': node.attrs.label,
        style: `
          background:#eef2ff;
          color:#3730a3;
          padding:2px 6px;
          border-radius:6px;
          font-size:12px;
          font-weight:500;
        `,
      }),
      `{{${node.attrs.label}}}`,
    ];
  },

  addCommands() {
    return {
      insertVariable:
        (label) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { label },
          });
        },
    };
  },
});


import { MenuItem, Select, Box } from '@mui/material';

export const VariablePicker = ({ editor }) => {
  if (!editor) return null;

  return (
    <Box sx={{ minWidth: 180 }}>
      <Select
        size="small"
        displayEmpty
        defaultValue=""
        onChange={(e) => {
          const value = e.target.value;
          if (!value) return;

          editor
            .chain()
            .focus()
            .insertVariable(value)
            .run();
        }}
      >
        <MenuItem value="">Insert variable</MenuItem>
        <MenuItem value="first_name">First Name</MenuItem>
        <MenuItem value="last_name">Last Name</MenuItem>
      </Select>
    </Box>
  );
};