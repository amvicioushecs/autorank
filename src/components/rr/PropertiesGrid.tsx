import React, { useMemo, useState } from 'react';
import { Property } from '@/data/platformData';
import { useRRData } from '@/contexts/RRDataContext';
import PropertyCard from './PropertyCard';
import StatsRow from './StatsRow';
import { Filter, ArrowUpDown, Loader2 } from 'lucide-react';

const filters = ['All', 'Rented', 'Ranking', 'Building', 'Optimizing', 'Leasing'];
const sorts = [
  { id: 'mrr', label: 'Revenue' },
  { id: 'rank', label: 'Ranking' },
  { id: 'leads', label: 'Leads' },
  { id: 'health', label: 'Health' },
];

const PropertiesGrid: React.FC<{ onSelect: (p: Property) => void }> = ({ onSelect }) => {
  const { properties, loading } = useRRData();
  const [filter, setFilter] = useState('All');
  const [sort, setSort] = useState('mrr');

  const list = useMemo(() => {
    let l = [...properties];
    if (filter !== 'All') l = l.filter((p) => p.status === filter.toLowerCase());
    l.sort((a, b) => {
      if (sort === 'mrr') return b.mrr - a.mrr;
      if (sort === 'rank') return a.rankPosition - b.rankPosition;
      if (sort === 'leads') return b.monthlyLeads - a.monthlyLeads;
      return b.health - a.health;
    });
    return l;
  }, [properties, filter, sort]);

  return (
    <div className="space-y-6">
      <StatsRow />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Filter className="w-4 h-4 text-slate-500 mr-1" />
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-all ${
                filter === f ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800/60 border border-transparent'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-slate-500" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="bg-slate-800/60 border border-slate-700 text-slate-200 text-xs rounded-lg px-3 py-1.5 outline-none focus:border-sky-500"
          >
            {sorts.map((s) => (
              <option key={s.id} value={s.id}>Sort: {s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-slate-500 gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading assets from database...
        </div>
      ) : list.length === 0 ? (
        <div className="text-center py-20 text-slate-500">No properties match this filter.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((p) => (
            <PropertyCard key={p.id} p={p} onClick={() => onSelect(p)} />
          ))}
        </div>
      )}
    </div>
  );
};

export default PropertiesGrid;
