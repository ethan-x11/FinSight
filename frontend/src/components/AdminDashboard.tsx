import { useEffect, useMemo, useState } from "react";
import { fetchUsers, fetchSessions, type ApiUser, type AnalysisSession } from "../utils/dataHandlerAPI";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { toast } from "sonner";
import { RefreshCcw, Users, FolderGit2, Shield, LogOut, Inbox, User, Activity, BarChart3 } from "lucide-react";
import { ProfileDialog } from "./ProfileDialog";
import { PasswordChangeDialog } from "./PasswordChangeDialog";
import { APP_BRAND_NAME, APP_TAGLINE } from "../config/appConfig";

interface AdminDashboardProps {
	user: ApiUser;
	// sessions: AnalysisSession[];
	onLogout: () => void;
	onGoHome: () => void;
}

export default function AdminDashboard({ user, onLogout, onGoHome }: AdminDashboardProps) {
	const [users, setUsers] = useState<ApiUser[]>([]);
	const [sessions, setSessions] = useState<AnalysisSession[]>([]);
	const [loading, setLoading] = useState(false);
	const [showProfile, setShowProfile] = useState(false);
	const [showPasswordChange, setShowPasswordChange] = useState(false);

	const recentActiveCount = useMemo(() => {
		const cutoff = Date.now() - 24 * 60 * 60 * 1000;
		return users.reduce((count, u) => {
			if (!u.lastActive) return count;
			const ts = new Date(u.lastActive).getTime();
			return Number.isNaN(ts) || ts < cutoff ? count : count + 1;
		}, 0);
	}, [users]);

	const sessionCountByUser = useMemo(() => {
		const counts: Record<string, number> = {};
		sessions.forEach((s) => {
			if (!s.userId) return;
			counts[s.userId] = (counts[s.userId] || 0) + 1;
		});
		return counts;
	}, [sessions]);

	const loadData = async () => {
		setLoading(true);
		try {
			const [u, s] = await Promise.all([fetchUsers(), fetchSessions(true)]);
			setUsers(u);
			setSessions(s);
		} catch (err: any) {
			toast.error(err?.message || "Failed to load admin data");
		} finally {
			setLoading(false);
		}
	};

	useEffect(() => {
		loadData();
	}, []);

	return (
		<div className="min-h-screen bg-slate-50">
			<header className="sticky top-0 h-16 border-b border-slate-200/70 bg-white/60 backdrop-blur-sm supports-[backdrop-filter]:bg-white/60 flex items-center justify-between px-6 shadow-sm">
				<div className="flex items-center gap-3">
					<div className="flex items-center space-x-2">
						<div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-900/50">
							<BarChart3 className="w-5 h-5 text-white" />
						</div>
						<span className="font-bold text-lg tracking-tight">{APP_BRAND_NAME}</span>
					</div>
					<Badge variant="outline">Admin Console</Badge>
				</div>
				<div className="flex items-center gap-2">
					{user.isAdmin && (
						<Badge variant="outline" className="flex items-center gap-1 text-amber-700 border-amber-200 bg-amber-50">
							<Shield className="w-3 h-3" /> Admin
						</Badge>
					)}
					<Button variant="ghost" size="sm" onClick={() => setShowProfile(true)}>
						<User className="w-4 h-4 mr-1" />
						{user.name}
					</Button>
					<Button variant="outline" size="sm" onClick={onLogout}>
						<LogOut className="w-4 h-4 mr-1" />
						Logout
					</Button>
				</div>
			</header>

			<main className="max-w-6xl mx-auto px-6 py-8 space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-slate-900">Control Plane</h1>
						<p className="text-slate-500 text-sm">Monitor users, sessions, and ingestion activity.</p>
					</div>
					<Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
						<RefreshCcw className="w-4 h-4 mr-1" />
						Refresh
					</Button>
				</div>

				<div className="grid md:grid-cols-3 gap-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm text-slate-600">
								<Users className="w-4 h-4 text-blue-600" /> Users
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-3xl font-semibold">{(users.length > 1) ? users.length - 1 : 0}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm text-slate-600">
								<FolderGit2 className="w-4 h-4 text-green-600" /> Sessions
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-3xl font-semibold">{sessions.length}</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2 text-sm text-slate-600">
								<Activity className="w-4 h-4 text-amber-600" />Recent Active
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-3xl font-semibold">{(recentActiveCount > 1)? recentActiveCount - 1 : 0}</p>
							<p className="text-xs text-slate-500 mt-1">Users active in last 24h</p>
						</CardContent>
					</Card>
				</div>

				<Card>
					<CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
						<CardTitle className="flex items-center gap-2 text-base">
							<Users className="w-4 h-4 text-blue-600" /> Users
						</CardTitle>
						<Badge variant="outline">{users.length} total</Badge>
					</CardHeader>
					<CardContent className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>User ID</TableHead>
									<TableHead>Name</TableHead>
									<TableHead>Email</TableHead>
									<TableHead>Last Active</TableHead>
									<TableHead>Sessions</TableHead>
									<TableHead>Role</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{users.map((u) => (
									<TableRow key={u.id}>
										<TableCell className="font-semibold">{u.id}</TableCell>
										<TableCell>{u.name}</TableCell>
										<TableCell>{u.email}</TableCell>
										<TableCell>{u.lastActive ? new Date(u.lastActive).toLocaleString() : ""}</TableCell>
										<TableCell>{sessionCountByUser[u.id] || 0}</TableCell>
										<TableCell>
											{u.isAdmin ? <Badge variant="outline">Admin</Badge> : <Badge variant="secondary">User</Badge>}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
						<CardTitle className="flex items-center gap-2 text-base">
							<FolderGit2 className="w-4 h-4 text-green-600" /> Sessions
						</CardTitle>
						<Badge variant="outline">{sessions.length} total</Badge>
					</CardHeader>
					<CardContent className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Session ID</TableHead>
									<TableHead>User</TableHead>
									<TableHead>Title</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Created</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{sessions.map((s) => (
									<TableRow key={s.id}>
										<TableCell className="font-semibold">{s.id}</TableCell>
										<TableCell>{s.userId}</TableCell>
										<TableCell className="max-w-[220px] truncate">{s.metadata?.title}</TableCell>
										<TableCell>
											<Badge variant="outline">{s.systemStatus?.overallStatus}</Badge>
										</TableCell>
										<TableCell>{s.metadata?.createdAt ? new Date(s.metadata.createdAt).toLocaleString() : ""}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			</main>
			{showProfile && <ProfileDialog open={showProfile} onClose={() => setShowProfile(false)} />}
			{showPasswordChange && <PasswordChangeDialog open={showPasswordChange} onClose={() => setShowPasswordChange(false)} />}
		</div>
	);
}
