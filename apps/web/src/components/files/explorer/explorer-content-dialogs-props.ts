import type {
  BuildExplorerBrowsePanePropsOptions,
  ContentDialogsProps,
} from "@/components/files/explorer/explorer-browse-pane-props-shared";

export function buildExplorerContentDialogsProps({
  editDialog,
  handleApplyEditDialog,
  handleEditDialogOpenChange,
  handleEditDialogValueChange,
  noteWorkflowContentDialogProps,
  propertiesItem,
  propertiesOpen,
  setPropertiesOpen,
}: BuildExplorerBrowsePanePropsOptions): ContentDialogsProps {
  return {
    editDialog,
    ...noteWorkflowContentDialogProps,
    onApplyEditDialog: handleApplyEditDialog,
    onEditDialogOpenChange: handleEditDialogOpenChange,
    onEditDialogValueChange: handleEditDialogValueChange,
    onPropertiesOpenChange: setPropertiesOpen,
    propertiesItem,
    propertiesOpen,
  };
}
