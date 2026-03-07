export function getFacehashUrl(name: string) {
  const seed = encodeURIComponent(name.trim() || "user")
  return `https://www.facehash.dev/api/avatar?name=${seed}`
}
