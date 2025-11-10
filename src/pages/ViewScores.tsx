import { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../lib/firebase";
import { motion } from "framer-motion";
import {
  Trophy, User, CheckCircle, XCircle, Code, FileText, Eye, Search, BarChart3,
} from "lucide-react";

interface Round1 {
  correct: number;
  wrong: number;
  score: number;
  answers?: any;
}

interface Round2 {
  id: string;
  code: string;
  durationSec: number;
  examViolations: number;
  language: string;
  passed: number;
  percentage: number;
  problemId: string;
  result: string;
  submittedAt: string;
  total: number;
}

interface UserData {
  uid: string;
  name: string;
  email: string;
  round1: Round1;
  round2: Round2[];
  r2Total: number;
  r2Passed: number;
  r2Percentage: number;
  totalScore: number;
  overallPercentage: number;
}

const ViewScores = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "totalScore" | "overallPercentage">("totalScore");
  const [filterByRound, setFilterByRound] = useState<"all" | "round1" | "round2">("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubResponses = onSnapshot(collection(db, "responses"), async (resSnap) => {
      const list: UserData[] = [];

      for (const res of resSnap.docs) {
        const uid = res.id;
        const data = res.data();

        let name = "Unknown";
        let email = "unknown@example.com";

        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) {
          const u = userSnap.data() as any;
          name = u.fullName || u.name || u.email || "Unknown";
          email = u.email || email;
        }

        // Round 1 Data
        const round1 = data.round1 || { correct: 0, wrong: 0, score: 0 };
        const r1Score = round1.score || 0;
        const r1Correct = round1.correct || 0;
        const r1Wrong = round1.wrong || 0;

        // Round 2 Dynamic Data
        const round2Ref = collection(db, "responses", uid, "round2");
        const round2Snap = await new Promise<any[]>((resolve) => {
          onSnapshot(round2Ref, (docsSnap) => {
            const temp: Round2[] = [];
            docsSnap.forEach((docSnap) => {
              temp.push({ id: docSnap.id, ...(docSnap.data() as any) });
            });
            resolve(temp);
          });
        });

        const r2Passed = round2Snap.reduce((sum, r) => sum + (r.passed || 0), 0);
        const r2Total = round2Snap.reduce((sum, r) => sum + (r.total || 0), 0);
        const r2Percentage = r2Total > 0 ? Math.round((r2Passed / r2Total) * 100) : 0;

        const totalScore = r1Score + r2Passed;
        const totalPossible = r1Correct + r1Wrong + r2Total;
        const overallPercentage = totalPossible > 0
          ? Math.round(((r1Score + r2Passed) / totalPossible) * 100)
          : 0;

        list.push({
          uid,
          name,
          email,
          round1,
          round2: round2Snap,
          totalScore,
          r2Passed,
          r2Total,
          r2Percentage,
          overallPercentage,
        });
      }

      setUsers(list);
      setLoading(false);
    });

    return () => unsubResponses();
  }, []);

  const filteredUsers = users
    .filter((u) => {
      const matches = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase());
      if (filterByRound === "round1") return matches && u.round1.score > 0;
      if (filterByRound === "round2") return matches && u.round2.length > 0;
      return matches;
    })
    .sort((a, b) =>
      sortBy === "name"
        ? a.name.localeCompare(b.name)
        : sortBy === "totalScore"
          ? b.totalScore - a.totalScore
          : b.overallPercentage - a.overallPercentage
    );

  const getBadge = (p: number) => {
    if (p >= 90) return { label: "Excellent", color: "bg-green-100 text-green-800 border-green-200" };
    if (p >= 75) return { label: "Good", color: "bg-blue-100 text-blue-800 border-blue-200" };
    if (p >= 60) return { label: "Average", color: "bg-yellow-100 text-yellow-800 border-yellow-200" };
    return { label: "Needs Improvement", color: "bg-red-100 text-red-800 border-red-200" };
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96 text-gray-600 dark:text-gray-400">
        Loading live results...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <motion.h1
          className="text-3xl font-bold text-slate-900 dark:text-white"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          Live Exam Scores
        </motion.h1>
      </div>

      {/* Top Performers */}
      <div className="rounded-2xl p-6 bg-[#eff1f6] dark:bg-slate-800 shadow">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6 flex items-center">
          <Trophy className="w-6 h-6 text-blue-600 mr-2" /> Top Performers
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {filteredUsers.slice(0, 3).map((u, i) => (
            <div key={u.uid} className="rounded-2xl p-5 bg-[#f3f5fa] dark:bg-slate-700 shadow">
              <div className="flex justify-between mb-2">
                <span className="font-bold">{i + 1}</span>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getBadge(u.overallPercentage).color}`}>
                  {u.overallPercentage}%
                </span>
              </div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{u.name}</h3>
              <p className="text-sm text-slate-600 dark:text-gray-300">{u.email}</p>
              <div className="text-2xl font-bold text-blue-600 mt-2">{u.totalScore} pts</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or email..."
            className="pl-10 pr-4 py-2 rounded-xl w-full bg-[#f3f5fa] dark:bg-slate-700 dark:text-white"
          />
        </div>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value as any)} className="p-2 rounded-xl bg-[#f3f5fa] dark:bg-slate-700 dark:text-white">
          <option value="totalScore">Sort by Total Score</option>
          <option value="overallPercentage">Sort by Percentage</option>
          <option value="name">Sort by Name</option>
        </select>
      </div>

      {/* User List */}
      <div className="rounded-2xl bg-[#eff1f6] dark:bg-slate-800 shadow overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#f3f5fa] dark:bg-slate-700 text-left">
            <tr>
              <th className="px-6 py-3">Student</th>
              <th className="px-6 py-3 text-center">Round 1</th>
              <th className="px-6 py-3 text-center">Round 2</th>
              <th className="px-6 py-3 text-center">Total</th>
              <th className="px-6 py-3 text-center">Performance</th>
              <th className="px-6 py-3 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((u, i) => {
              const badge = getBadge(u.overallPercentage);
              return (
                <tr key={u.uid} className="border-t border-slate-200 dark:border-slate-700 hover:bg-[#f9fafc] dark:hover:bg-slate-700 transition">
                  <td className="px-6 py-4 font-medium">{u.name}</td>
                  <td className="px-6 py-4 text-center">{u.round1.score}</td>
                  <td className="px-6 py-4 text-center">
                    {u.r2Passed}/{u.r2Total} ({u.r2Percentage}%)
                  </td>
                  <td className="px-6 py-4 text-center">{u.totalScore}</td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full border text-xs ${badge.color}`}>{badge.label}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedUser(u)}
                      className="px-3 py-2 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-lg hover:scale-105 transition"
                    >
                      <Eye className="w-4 h-4 inline mr-1" /> View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ViewScores;
