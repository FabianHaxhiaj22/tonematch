// Conventional Commits (README §9.3). PR titles are checked separately in CI (pr-title.yml),
// because squash-merge turns the PR title into the commit message on main.
const config = {
  extends: ["@commitlint/config-conventional"],
};

export default config;
