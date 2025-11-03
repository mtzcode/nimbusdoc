export const queryKeys = {
  clients: () => ["clients"] as const,
  accountants: () => ["accountants"] as const,
  siteUsers: () => ["site-users"] as const,
  folders: (clientId: string) => ["folders", clientId] as const,
  files: (folderId: string) => ["files", folderId] as const,
  permissions: () => ["permissions"] as const,
};

export type QueryKey = ReturnType<
  | typeof queryKeys.clients
  | typeof queryKeys.accountants
  | typeof queryKeys.siteUsers
  | typeof queryKeys.folders
  | typeof queryKeys.files
  | typeof queryKeys.permissions
>;