import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CircuitEntry, CircuitCategory, SetupList } from '@circuitjs/circuits';
import { fetchAndParseSetupList, fetchCircuitFile } from '@circuitjs/circuits';

interface ExampleBrowserProps {
    onLoadCircuit: (text: string, name: string) => void;
    onClose: () => void;
}

function flattenCircuits(categories: CircuitCategory[]): CircuitEntry[] {
    const result: CircuitEntry[] = [];
    function walk(cats: CircuitCategory[]) {
        for (const cat of cats) {
            result.push(...cat.circuits);
            walk(cat.subcategories);
        }
    }
    walk(categories);
    return result;
}

function searchCircuits(entries: CircuitEntry[], query: string): CircuitEntry[] {
    if (!query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter(
        (e) => e.title.toLowerCase().includes(q) || e.file.toLowerCase().includes(q)
    );
}

export function ExampleBrowser({ onLoadCircuit, onClose }: ExampleBrowserProps) {
    const { t } = useTranslation();
    const [setupList, setSetupList] = useState<SetupList | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [loadingCircuit, setLoadingCircuit] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const result = await fetchAndParseSetupList('/setuplist.txt');
                if (!cancelled) {
                    setSetupList(result);
                    setLoading(false);
                }
            } catch (e) {
                if (!cancelled) {
                    setError(e instanceof Error ? e.message : String(e));
                    setLoading(false);
                }
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const allEntries = useMemo(
        () => (setupList ? flattenCircuits(setupList.categories) : []),
        [setupList]
    );

    const categoryCircuits = useMemo(() => {
        if (!setupList) return new Map<string, CircuitEntry[]>();
        const map = new Map<string, CircuitEntry[]>();
        function walk(cats: CircuitCategory[], prefix = '') {
            for (const cat of cats) {
                const key = prefix ? `${prefix} > ${cat.name}` : cat.name;
                map.set(key, cat.circuits);
                walk(cat.subcategories, key);
            }
        }
        walk(setupList.categories);
        return map;
    }, [setupList]);

    const displayedCircuits = useMemo(() => {
        let entries: CircuitEntry[];

        if (searchQuery.trim()) {
            entries = searchCircuits(allEntries, searchQuery);
        } else if (selectedCategory) {
            entries = categoryCircuits.get(selectedCategory) ?? [];
        } else {
            const firstKey = categoryCircuits.keys().next().value;
            entries = firstKey ? (categoryCircuits.get(firstKey) ?? []) : [];
        }

        return entries;
    }, [allEntries, categoryCircuits, selectedCategory, searchQuery]);

    const handleCircuitClick = useCallback(
        async (entry: CircuitEntry) => {
            setLoadingCircuit(entry.file);
            try {
                const text = await fetchCircuitFile(entry.file);
                onLoadCircuit(text, entry.title);
            } catch (e) {
                setError(e instanceof Error ? e.message : String(e));
                setLoadingCircuit(null);
            }
        },
        [onLoadCircuit]
    );

    useEffect(() => {
        if (!searchQuery && !selectedCategory && categoryCircuits.size > 0) {
            const firstKey = categoryCircuits.keys().next().value;
            if (firstKey) setSelectedCategory(firstKey);
        }
    }, [categoryCircuits, searchQuery, selectedCategory]);

    const categoryKeys = useMemo(() => Array.from(categoryCircuits.keys()), [categoryCircuits]);

    if (loading) {
        return (
            <div className="flex flex-col h-[480px] font-mono text-circuit-lg text-circuit-text">
                <div className="p-5 text-center text-circuit-text-muted">{t('dialog.examples.loading')}</div>
            </div>
        );
    }

    if (error && !setupList) {
        return (
            <div className="flex flex-col h-[480px] font-mono text-circuit-lg text-circuit-text">
                <div className="p-5 text-center text-red-500">{t('dialog.examples.error', { message: error })}</div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[480px] font-mono text-circuit-lg text-circuit-text-secondary">
            {/* Search bar */}
            <div className="p-2 border-b border-circuit-border">
                <input
                    className="w-full px-2 py-1.5 bg-circuit-bg-secondary border border-[#444] rounded text-circuit-text font-mono text-circuit-lg outline-none box-border"
                    type="text"
                    placeholder={t('dialog.examples.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (e.target.value) setSelectedCategory(null);
                    }}
                    autoFocus
                />
            </div>

            {/* Main panel */}
            <div className="flex flex-1 overflow-hidden">
                {/* Category sidebar */}
                <div className="w-[180px] border-r border-circuit-border overflow-y-auto shrink-0">
                    {categoryKeys.map((key) => {
                        const parts = key.split(' > ');
                        const isTopLevel = parts.length === 1;
                        const isActive = key === selectedCategory;

                        if (isTopLevel) {
                            return (
                                <div
                                    key={key}
                                    className={`px-2.5 py-1.5 cursor-pointer select-none text-circuit-text-secondary text-circuit-lg
                                        ${isActive ? 'text-circuit-text border-l-3 border-circuit-success bg-[#222]' : 'border-l-3 border-transparent'}`}
                                    onClick={() => { setSelectedCategory(key); setSearchQuery(''); }}
                                >
                                    {parts[0]}
                                    <span className="text-circuit-text-dim text-circuit-sm ml-1">
                                        ({categoryCircuits.get(key)?.length ?? 0})
                                    </span>
                                </div>
                            );
                        } else {
                            return (
                                <div
                                    key={key}
                                    className={`px-2.5 py-1 pl-6 cursor-pointer select-none text-circuit-text-dim text-circuit-base
                                        ${isActive ? 'text-circuit-text border-l-3 border-circuit-success bg-[#222]' : 'border-l-3 border-transparent'}`}
                                    onClick={() => { setSelectedCategory(key); setSearchQuery(''); }}
                                >
                                    {parts[parts.length - 1]}
                                    <span className="text-circuit-text-dim text-circuit-sm ml-1">
                                        ({categoryCircuits.get(key)?.length ?? 0})
                                    </span>
                                </div>
                            );
                        }
                    })}
                </div>

                {/* Circuit list */}
                <div className="flex-1 overflow-y-auto">
                    {displayedCircuits.length === 0 ? (
                        <div className="p-5 text-center text-circuit-text-dim">
                            {searchQuery ? t('dialog.examples.noMatch', { query: searchQuery }) : t('dialog.examples.noCategory')}
                        </div>
                    ) : (
                        displayedCircuits.map((entry) => (
                            <div
                                key={entry.file}
                                className="px-3 py-2 cursor-pointer border-b border-[#2a2a2a] flex justify-between items-center hover:bg-[#2a2a2a]"
                                onClick={() => handleCircuitClick(entry)}
                            >
                                <span className="text-circuit-text-secondary">{entry.title}</span>
                                <span className="text-circuit-text-dim text-circuit-sm">
                                    {loadingCircuit === entry.file ? t('dialog.examples.loadingCircuit') : entry.file}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
