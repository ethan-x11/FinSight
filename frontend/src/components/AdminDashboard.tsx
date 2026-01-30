import { useEffect, useState } from "react";
import { fetchUsers, fetchSessions, type ApiUser, type AnalysisSession } from "../utils/dataHandlerAPI";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import { toast } from "sonner";
import { RefreshCcw, Users, FolderGit2, Shield, LogOut, Inbox } from "lucide-react";

interface AdminDashboardProps {
	user: ApiUser;
	onLogout: () => void;
	onGoHome: () => void;
}

export default function AdminDashboard({ user, onLogout, onGoHome }: AdminDashboardProps) {
	const [users, setUsers] = useState<ApiUser[]>([]);
	const [sessions, setSessions] = useState<AnalysisSession[]>([]);
	const [loading, setLoading] = useState(false);

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
			<header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shadow-sm">
				<div className="flex items-center gap-3">
					<Shield className="w-5 h-5 text-amber-600" />
					<span className="font-semibold">Admin Console</span>
					<Badge variant="outline">{user.email}</Badge>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" size="sm" onClick={onGoHome}>
						<Inbox className="w-4 h-4 mr-1" /> Home
					</Button>
					<Button variant="destructive" size="sm" onClick={onLogout}>
						<LogOut className="w-4 h-4 mr-1" /> Logout
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
							<p className="text-3xl font-semibold">{users.length}</p>
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
								<Shield className="w-4 h-4 text-amber-600" /> Admin
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-3xl font-semibold">{user.isAdmin ? "Yes" : "No"}</p>
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
										<TableCell>{u.sessionCount}</TableCell>
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
		</div>
	);
}
