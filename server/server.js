const express = require("express");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const github = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`
  }
});

// Health Check Route
app.get("/", (req, res) => {
  res.send("GitHub Intelligence API Running");
});

// GitHub Repository Route
app.get("/repo/:owner/:repo", async (req, res) => {
  try {
    const { owner, repo } = req.params;

    const response = await github.get(
      `/repos/${owner}/${repo}`
    );

    res.json({
      name: response.data.name,
      description: response.data.description,
      stars: response.data.stargazers_count,
      forks: response.data.forks_count,
      language: response.data.language,
      openIssues: response.data.open_issues_count,
      watchers: response.data.watchers_count,
      defaultBranch: response.data.default_branch,
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at,
      license: response.data.license?.name || "No License"
    });

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});
app.get("/repo/:owner/:repo/contributors", async (req, res) => {
  try {
    const { owner, repo } = req.params;

    const response = await github.get(
      `/repos/${owner}/${repo}/contributors`
    );

    const contributors = response.data.slice(0, 10).map(c => ({
      login: c.login,
      contributions: c.contributions,
      avatar: c.avatar_url
    }));

    res.json(contributors);

  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});
app.get("/repo/:owner/:repo/commits", async (req, res) => {
  try {

    const { owner, repo } = req.params;

    const response = await github.get(
      `/repos/${owner}/${repo}/commits`
    );

    const commits = response.data.slice(0, 5).map(commit => ({
      message: commit.commit.message.split('\n')[0],
      author: commit.commit.author.name,
      date: commit.commit.author.date
    }));

    res.json(commits);

  } catch (err) {
    res.status(500).json({
      error: err.message
    });
  }
});
app.get("/repo/:owner/:repo/activity", async (req, res) => {
  try {

    const { owner, repo } = req.params;

    const response = await github.get(
      `/repos/${owner}/${repo}/commits?per_page=100`
    );

    const commits = response.data;

    const activity = {};

    commits.forEach(commit => {

      const date = commit.commit.author.date
        .slice(0, 10);

      activity[date] =
        (activity[date] || 0) + 1;

    });

    const result = Object.entries(activity)
      .map(([date, count]) => ({
        date,
        commits: count
      }))
      .sort((a, b) =>
        new Date(a.date) - new Date(b.date)
      );

    res.json(result);

  }
  catch (err) {

    res.status(500).json({
      error: err.message
    });

  }

});
app.get("/repo/:owner/:repo/languages", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const response = await github.get(
      `/repos/${owner}/${repo}/languages`
    );
    res.json(response.data)
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

app.get("/repo/:owner/:repo/insights", async (req, res) => {
  try {
    const { owner, repo } = req.params;
    const repoResponse = await github.get(
      `/repos/${owner}/${repo}`
    );
    const contributorResponse = await github.get(
      `/repos/${owner}/${repo}/contributors`
    );
    res.json({
      name: repoResponse.data.name,
      description: repoResponse.data.description,
      language: repoResponse.data.language,
      stars: repoResponse.data.stargazers_count,
      forks: repoResponse.data.forks_count,
      openIssue: repoResponse.data.open_issues_count,
      contributors: contributorResponse.data.length
    })
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});
app.get("/repo/:owner/:repo/health", async (req, res) => {
  try {
    const { owner, repo } = req.params;

    const repoResponse = await github.get(
      `/repos/${owner}/${repo}`
    );

    const contributorResponse = await github.get(
      `/repos/${owner}/${repo}/contributors`
    );

    const commitResponse = await github.get(
      `/repos/${owner}/${repo}/commits`
    );

    const stars = repoResponse.data.stargazers_count;
    const forks = repoResponse.data.forks_count;
    const issues = repoResponse.data.open_issues_count;

    const contributors = contributorResponse.data.length;
    const commits = commitResponse.data.length;


    let score = 0;

    score += Math.min(stars / 1000, 40);

    score += Math.min(forks / 500, 20);

    score += Math.min(contributors, 20);

    score += Math.min(commits, 10);

    score += Math.max(10 - issues / 100, 0);


    res.json({
      healthScore: Math.round(score)
    });

  } catch (err) {

    res.status(500).json({
      error: err.message
    });

  }
});
app.get("/repo/:owner/:repo/summary", async (req, res) => {
  try {
    const { owner, repo } = req.params;

    const repoRes = await github.get(`/repos/${owner}/${repo}`);

    const contributorRes = await github.get(
      `/repos/${owner}/${repo}/contributors`
    );

    const commitRes = await github.get(
      `/repos/${owner}/${repo}/commits`
    );

    const prompt = `
You are an expert software engineer and technical writer.

Analyze the following GitHub repository and generate a professional summary.

Repository Name: ${repoRes.data.name}
Description: ${repoRes.data.description}
Primary Language: ${repoRes.data.language}
Stars: ${repoRes.data.stargazers_count}
Forks: ${repoRes.data.forks_count}
Open Issues: ${repoRes.data.open_issues_count}
Contributors: ${contributorRes.data.length}
Latest Commit: ${commitRes.data[0].commit.message}

Return the response in exactly this Markdown format:

# 📌 Repository Overview
(2-3 sentences describing the project.)

## ⭐ Popularity
Mention stars and forks and explain what they indicate.

## 🛠 Maintenance
Comment on open issues and development status.

## 👥 Community
Comment on contributor activity and recent development.

## 🚀 Overall Assessment
Write one concise sentence summarizing the repository quality.

Keep the response under 180 words.
Do not mention prompts or metadata.
`;

    const llamaResponse = await axios.post(
      "http://localhost:11434/api/generate",
      {
        model: "llama3.2",
        prompt: prompt,
        stream: false
      }
    );

    res.json({
      summary: llamaResponse.data.response
    });

  } catch (err) {

    console.log(err.message);

    res.status(500).json({
      error: err.message
    });

  }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});