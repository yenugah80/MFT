// Minimal stub hook for posts
export function usePosts(username) {
  return {
    posts: [],
    refetch: () => {},
    isLoading: false,
    isRefetching: false,
  };
}
