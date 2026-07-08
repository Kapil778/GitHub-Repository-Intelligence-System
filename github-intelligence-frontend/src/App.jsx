import { useState } from 'react'
import axios from "axios";
import './App.css'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer
}
  from "recharts";
import ReactMarkdown from "react-markdown";
function App() {
  const COLORS = [
    "#2563eb",
    "#16a34a",
    "#eab308",
    "#ef4444",
    "#8b5cf6"
  ];
  const [owner, setOwner] = useState("");
  const [repo, setRepo] = useState("");
  const [repoData, setRepoData] = useState(null);
  const [contributors, setContributors] = useState([]);
  const [commits, setCommits] = useState([]);
  const [healthScore, setHealthScore] = useState(null);
  const [languages, setLanguages] = useState([]);
  const [activity, setActivity] = useState([]);
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const API_BASE = "http://localhost:5000";

  const analyzeRepo = async () => {
    if (!owner || !repo) {
      setError("Please enter both Owner and Repository name.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const response = await axios.get(
        `${API_BASE}/repo/${owner}/${repo}`
      );
      const contributorResponse = await axios.get(
        `${API_BASE}/repo/${owner}/${repo}/contributors`
      );
      const commitRes = await axios.get(
        `${API_BASE}/repo/${owner}/${repo}/commits`
      );
      const activityRes = await axios.get(
        `${API_BASE}/repo/${owner}/${repo}/activity`
      );
      const healthRes = await axios.get(
        `${API_BASE}/repo/${owner}/${repo}/health`
      );
      const languageRes = await axios.get(
        `${API_BASE}/repo/${owner}/${repo}/languages`
      );
      const summaryRes = await axios.get(
        `${API_BASE}/repo/${owner}/${repo}/summary`
      );

      // Convert language bytes into percentages
      const data = languageRes.data;

      const total = Object.values(data).reduce((a, b) => a + b, 0);

      const chartData = Object.entries(data)
        .map(([name, value]) => ({
          name,
          value: Number(((value / total) * 100).toFixed(1))
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      setLanguages(chartData);
      setActivity(
        activityRes.data
      );

      setHealthScore(healthRes.data.healthScore);

      setCommits(commitRes.data);

      setRepoData(response.data);
      setSummary(summaryRes.data.summary);

      setContributors(contributorResponse.data);

    } catch (err) {
      setError("Repository not found. Please check the Owner and Repository name.");
      setRepoData(null);
      setContributors([]);
      setCommits([]);
      setLanguages([]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <>
      <div className='container'>
        <h1>GitHub Repository Intelligence</h1>
        <div className='search-bar'>
          <input type="text" placeholder="Owner" value={owner} onChange={(e) => setOwner(e.target.value)} />
          <input
            type="text"
            placeholder="Repository"
            value={repo}
            onChange={(e) => setRepo(e.target.value)} />
          <button onClick={analyzeRepo}>
            Analyze
          </button>
        </div>
      </div>


      {loading && (
        <div className='loading'>
          <div className='spinner'></div>
          <p>Analyzing repository...</p>
        </div>
      )}

      {error && (
        <div className='error-message'>
          <p>⚠️ {error}</p>
        </div>

      )}

      {repoData && (
        <>
          <div className='repo-card'>
            <div className='repo-header'>
              <div className='repo-title'>
                <h1>
                  🐙 {repoData.name}</h1>

                <p>{repoData.description}</p>
                <div className='repo-tags'>

                  <span>{repoData.language}</span>

                  <span>{repoData.license}</span>

                  <span>{repoData.defaultBranch}</span>

                </div>
              </div>
              <div className='repo-score'>
                <div className='score-circle'>
                  {healthScore}
                </div>
                <p>Health Score</p>
              </div>
            </div>
            <div className='stats'>
              <div className="stat-card" >
                ⭐
                <h3>{repoData.stars}</h3>
                <p>Stars</p>
              </div>
              <div className="stat-card">
                🍴
                <h3>{repoData.forks}</h3>
                <p>Forks</p>
              </div>
              <div className="stat-card">
                👀
                <h3> {repoData.watchers}</h3>
                <p>Watchers</p>
              </div>
              <div className="stat-card">
                🐞
                <h3>{repoData.openIssues}</h3>
                <p>Issues</p>
              </div>
            </div>
            <div className='repo-info'>
              <div className="info-card">
                <strong>Created</strong>
                <p>
                  📅 {new Date(repoData.createdAt).toLocaleDateString()}</p>
              </div>
              <div className="info-card">
                <strong>Updated</strong>
                <p>
                  📅{new Date(repoData.updatedAt).toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          <div className='middle-section'>

            <div className="summary-card">
              <h2>🤖 AI Repository Summary</h2>
              <ReactMarkdown>{summary}</ReactMarkdown>
            </div>
            <div className="chart">
              <h2>💻 Language Distribution</h2>

              {languages.map((lang, index) => (
                <div className="language-card" key={index}>
                  <div className="language-top">
                    <span className='language-name'>{lang.name}</span>
                    <span className='language-value'>{lang.value}%</span>
                  </div>

                  <div className="language-track">
                    <div
                      className="language-fill"
                      style={{
                        width: `${lang.value}%`,
                        background: COLORS[index % COLORS.length]
                      }}
                    />
                  </div>

                </div>
              ))}

            </div>
            <div className="activity-card">

              <h2>📈 Commit Activity</h2>

              <div className="chart-wrapper">

                <ResponsiveContainer width="100%" height={300}>

                  <LineChart data={activity}>

                    <CartesianGrid strokeDasharray="3 3" />

                    <XAxis
                      dataKey="date"
                      interval={4}
                      tickFormatter={(d) => d.slice(5)}
                    />

                    <YAxis />

                    <Tooltip />

                    <Line
                      type="monotone"
                      dataKey="commits"
                      stroke="#2563eb"
                      strokeWidth={3}
                    />

                  </LineChart>

                </ResponsiveContainer>

              </div>

            </div>

            <div className='commit-card'>

              <h2>Recent Commits</h2>

              {commits.map((commit, index) => (

                <div className="single-commit" key={index}>

                  <p>
                    <strong>{commit.message}</strong>
                  </p>

                  <small>{commit.author}</small>

                </div>

              ))}

            </div>




            <div className="contributors-section">

              <h2>Top Contributors</h2>

              <div className='contributors'>

                {contributors.map((contributor) => (

                  <div
                    className="contributor-card"
                    key={contributor.login}
                  >

                    <img
                      src={contributor.avatar}
                      alt={contributor.login}
                    />

                    <div>

                      <p>{contributor.login}</p>

                      <small>
                        {contributor.contributions} contributions
                      </small>

                    </div>

                  </div>

                ))}

              </div>

            </div>


          </div>
        </>
      )}




    </>
  )
}
export default App;
