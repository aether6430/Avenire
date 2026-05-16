export function resolveAccountDeleteFailure(deleted: { id: string } | null) {
  if (deleted) {
    return null;
  }

  return {
    error: "Account not found",
    status: 404,
  };
}

export function buildAccountDeleteSuccessBody() {
  return {
    ok: true,
  };
}
