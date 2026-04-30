import { useState, useRef, useEffect, useCallback } from 'react';
import { employeeQuickSearch } from '../api/demerit';

interface Employee {
  id: number;
  app_number: string;
  name: string;
  store_name?: string;
}

interface EmployeeQuickSearchProps {
  value: Employee | null;
  onChange: (emp: Employee | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function EmployeeQuickSearch({
  value,
  onChange,
  placeholder = '輸入一字即可搜尋...',
  disabled = false,
}: EmployeeQuickSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (kw: string) => {
    if (!kw.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await employeeQuickSearch(kw.trim());
      setResults(res.data || []);
      setOpen(true);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const kw = e.target.value;
    setQuery(kw);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(kw), 200);
  };

  const handleSelect = (emp: Employee) => {
    onChange(emp);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const handleClear = () => {
    onChange(null);
    setQuery('');
    setResults([]);
  };

  // 點外部關閉
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ESC 收起
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') setOpen(false);
  };

  // 已選擇狀態
  if (value) {
    return (
      <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <div className="text-sm">
          <span className="font-semibold text-blue-800">{value.name}</span>
          {value.store_name && (
            <span className="text-[#8b6f4e] ml-2 text-xs">（{value.store_name}）</span>
          )}
          <span className="text-gray-400 ml-2 text-xs">#{value.app_number}</span>
        </div>
        <button
          type="button"
          onClick={handleClear}
          className="text-xs text-gray-400 hover:text-red-400 ml-3 shrink-0"
        >
          ✕ 清除
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={() => query && setOpen(true)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#8b6f4e] focus:border-transparent disabled:bg-gray-100"
      />
      {loading && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">搜尋中...</div>
      )}
      {open && results.length > 0 && (
        <div className="absolute z-30 top-full left-0 right-0 bg-white border rounded-lg shadow-lg max-h-56 overflow-y-auto mt-1">
          {results.map(emp => (
            <button
              key={emp.id}
              type="button"
              onMouseDown={() => handleSelect(emp)}
              className="w-full text-left px-3 py-2.5 hover:bg-[#f5f0eb] text-sm flex justify-between items-center border-b last:border-0"
            >
              <span>
                <span className="font-medium">{emp.name}</span>
                {emp.store_name && (
                  <span className="text-gray-400 ml-1.5 text-xs">（{emp.store_name}）</span>
                )}
              </span>
              <span className="text-gray-400 text-xs shrink-0">#{emp.app_number}</span>
            </button>
          ))}
        </div>
      )}
      {open && query.trim() && !loading && results.length === 0 && (
        <div className="absolute z-30 top-full left-0 right-0 bg-white border rounded-lg shadow mt-1 px-3 py-2 text-sm text-gray-400">
          查無符合員工
        </div>
      )}
    </div>
  );
}
