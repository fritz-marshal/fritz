// Ambient module declarations for third-party packages used only by Fritz's
// SkyPortal extensions that ship no TypeScript types of their own. Declaring
// them (implicitly `any`) keeps strict tsc happy without @types packages.
// (Named differently from skyportal's own static/js/declarations.d.ts so the
// copy_tree patch step adds these alongside it rather than overwriting it.)
declare module "react-latex-next";
declare module "equation-editor-react";
declare module "react-copy-to-clipboard";
declare module "react-diff-viewer";
