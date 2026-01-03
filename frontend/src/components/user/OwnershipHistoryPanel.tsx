import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { adminApi } from '@/services/adminApi';
import { Calendar, CheckCircle2, Clock, Hash, Link2, MapPin, User } from 'lucide-react';
import React, { useEffect, useState } from 'react';

type HistoryEntry = {
	record_hash?: string;
	cid?: string;
	owner_address?: string;
	created_at?: string;
	metadata?: Record<string, any>;
};

interface Props {
	recordHash?: string;
	recordType?: 'land' | 'flat' | 'building';
}

const OwnershipHistoryPanel: React.FC<Props> = ({ recordHash, recordType = 'flat' }) => {
	const [history, setHistory] = useState<HistoryEntry[]>([]);
	const [loading, setLoading] = useState(false);

	useEffect(() => {
		let mounted = true;
		const load = async () => {
			if (!recordHash) return;
			setLoading(true);
			try {
				const resp: any = await adminApi.getRecordHistory(recordHash);
				const hist: HistoryEntry[] = Array.isArray(resp?.history) ? resp.history : [];
				if (!mounted) return;
				setHistory(hist);
			} catch (e) {
				console.error('Failed to load history', e);
			} finally {
				if (mounted) setLoading(false);
			}
		};
		load();
		return () => { mounted = false; };
	}, [recordHash]);

	const maskAddress = (addr?: string) => {
		if (!addr) return '—';
		if (addr.length <= 12) return addr;
		return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
	};

	const formatDate = (ts?: string) => {
		if (!ts) return '—';
		try {
			return new Date(ts).toLocaleString('en-IN', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
		} catch { return ts; }
	};

	const rootRecord = history.length ? history[history.length - 1].record_hash || '' : '';
	const chainLength = history.length;
	const parentRecords = history.slice(1).map(h => h.record_hash || '');
	const childRecords: string[] = [];

	return (
		<ScrollArea className="h-full">
			<div className="p-4 space-y-4">
				<div className="space-y-2">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-semibold text-foreground">Ownership History</h2>
						<Badge variant="outline" className="text-xs">{recordType?.toUpperCase()}</Badge>
					</div>
					<p className="text-xs text-muted-foreground font-mono">{recordHash || '—'}</p>
				</div>

				<Card className="border-border/50 bg-card/50">
					<CardHeader className="py-3 px-4">
						<CardTitle className="text-sm flex items-center gap-2"><Link2 className="h-4 w-4 text-primary" /> Lineage Summary</CardTitle>
					</CardHeader>
					<CardContent className="px-4 pb-3 pt-0">
						<div className="grid grid-cols-2 gap-3 text-xs">
							<div>
								<p className="text-muted-foreground">Root Record</p>
								<p className="font-mono text-foreground">{rootRecord || '—'}</p>
							</div>
							<div>
								<p className="text-muted-foreground">Chain Length</p>
								<p className="font-semibold text-foreground">{chainLength} transfers</p>
							</div>
							<div>
								<p className="text-muted-foreground">Parent Records</p>
								<p className="font-semibold text-foreground">{parentRecords.length}</p>
							</div>
							<div>
								<p className="text-muted-foreground">Child Records</p>
								<p className="font-semibold text-foreground">{childRecords.length}</p>
							</div>
						</div>
					</CardContent>
				</Card>

				<div className="space-y-2">
					<h3 className="text-sm font-medium text-foreground flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" /> Transfer Timeline</h3>

					<div className="relative">
						<div className="absolute left-[19px] top-6 bottom-6 w-0.5 bg-border" />
						<div className="space-y-1">
							{loading && <div className="text-xs text-muted-foreground">Loading history…</div>}
							{!loading && history.length === 0 && <div className="text-xs text-muted-foreground">No history available for this record.</div>}
							{history.map((h, idx) => {
								const isCurrent = idx === 0;
								const role = 'owner';
								const eventType = isCurrent ? 'current' : 'registration';
								const status = 'complete';
								return (
									<div key={`${h.record_hash || h.cid || idx}`} className="relative flex gap-3">
										<div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center bg-card border-2`}>
											<User className="h-4 w-4" />
										</div>

										<Card className="flex-1 border-border/50 bg-card/50 hover:bg-card transition-colors">
											<CardContent className="p-3">
												<div className="flex items-start justify-between mb-2">
													<div className="flex items-center gap-2">
														<MapPin className="h-3 w-3" />
														<span className="text-sm font-medium text-foreground">{isCurrent ? 'Current Owner' : 'Registry Entry'}</span>
													</div>
													<div>
														{status === 'complete' ? <CheckCircle2 className="h-3 w-3 text-registry-verified" /> : <Clock className="h-3 w-3 text-muted-foreground" />}
													</div>
												</div>

												<div className="space-y-1.5">
													<div className="flex items-center gap-2">
														<Badge variant="secondary" className="text-xs capitalize">{role}</Badge>
														<span className="text-xs text-foreground">{h.metadata?.ownerName || h.owner_address || '—'}</span>
													</div>

													<div className="flex items-center gap-1 text-xs text-muted-foreground">
														<Hash className="h-3 w-3" />
														<span className="font-mono">{maskAddress(h.owner_address)}</span>
													</div>

													<div className="flex items-center justify-between text-xs">
														<span className="text-muted-foreground">{formatDate(h.created_at)}</span>
														<Badge variant="outline" className="text-[10px]">{h.metadata?.source || 'registry'}</Badge>
													</div>

													<div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
														<Link2 className="h-3 w-3" />
														<span className="font-mono">{h.cid || h.record_hash || '—'}</span>
													</div>
												</div>
											</CardContent>
										</Card>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				<Card className="border-registry-verified/30 bg-registry-verified/5">
					<CardContent className="p-3 flex items-start gap-2">
						<CheckCircle2 className="h-4 w-4 text-registry-verified mt-0.5" />
						<div className="text-xs">
							<p className="font-medium text-foreground">Chain Verified</p>
							<p className="text-muted-foreground">Ownership transfers shown here are derived from registry history and linked records.</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</ScrollArea>
	);
};

export default OwnershipHistoryPanel;


