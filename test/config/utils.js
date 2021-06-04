function resetStore(Userfront) {
  Userfront.store = {
    mode: Userfront.isTestHostname() ? "test" : "live",
  };
}

export default {
  resetStore,
};
