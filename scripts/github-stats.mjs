// Pulls public GitHub activity for one user and writes assets/github.json.
// Runs in GitHub Actions with the repo's own token, so visitors never hit an API.
import { writeFileSync } from "node:fs";

const login = process.env.GH_LOGIN || "dasariprashant0";
const token = process.env.GH_TOKEN;
if (!token) throw new Error("GH_TOKEN is required");

const query = `query($login: String!) {
  user(login: $login) {
    followers { totalCount }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
      totalCount
      nodes {
        stargazerCount
        languages(first: 10, orderBy: { field: SIZE, direction: DESC }) {
          edges { size node { name color } }
        }
      }
    }
    contributionsCollection {
      totalCommitContributions
      contributionCalendar {
        totalContributions
        weeks { contributionDays { date contributionCount } }
      }
    }
  }
}`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: { Authorization: `bearer ${token}`, "Content-Type": "application/json", "User-Agent": login },
  body: JSON.stringify({ query, variables: { login } }),
});
const { data, errors } = await res.json();
if (errors || !data?.user) throw new Error(JSON.stringify(errors || data));
const u = data.user;

// Languages: sum bytes across repos, keep the top six as percentages.
const bytes = new Map();
for (const r of u.repositories.nodes)
  for (const { size, node } of r.languages.edges)
    bytes.set(node.name, { color: node.color, size: (bytes.get(node.name)?.size || 0) + size });
const total = [...bytes.values()].reduce((s, l) => s + l.size, 0);
const languages = [...bytes]
  .sort((a, b) => b[1].size - a[1].size)
  .slice(0, 6)
  .map(([name, l]) => ({ name, color: l.color, pct: Math.round((l.size / total) * 1000) / 10 }));

// Streaks: consecutive days with at least one contribution, ending today or yesterday.
const days = u.contributionsCollection.contributionCalendar.weeks.flatMap((w) => w.contributionDays);
let longest = 0, run = 0;
for (const d of days) { run = d.contributionCount ? run + 1 : 0; longest = Math.max(longest, run); }
let current = 0;
for (let i = days.length - 1; i >= 0; i--) {
  if (days[i].contributionCount) current++;
  else if (i === days.length - 1) continue; // today can still be empty
  else break;
}

const out = {
  updated: new Date().toISOString().slice(0, 10),
  followers: u.followers.totalCount,
  repos: u.repositories.totalCount,
  stars: u.repositories.nodes.reduce((s, r) => s + r.stargazerCount, 0),
  commitsYear: u.contributionsCollection.totalCommitContributions,
  contributionsYear: u.contributionsCollection.contributionCalendar.totalContributions,
  currentStreak: current,
  longestStreak: longest,
  languages,
  start: days[0].date,
  weeks: u.contributionsCollection.contributionCalendar.weeks.map((w) => w.contributionDays.map((d) => d.contributionCount)),
};
writeFileSync(new URL("../assets/github.json", import.meta.url), JSON.stringify(out));
console.log(`${out.contributionsYear} contributions, ${out.commitsYear} commits, ${languages.length} languages`);
