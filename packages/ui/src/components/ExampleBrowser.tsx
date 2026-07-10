import React, { useCallback, useEffect, useMemo, useState } from 'react';
import type { CircuitEntry, CircuitCategory, SetupList } from '@circuitjs/circuits';
import { fetchAndParseSetupList, fetchCircuitFile } from '@circuitjs/circuits';

interface ExampleBrowserProps {
    onLoadCircuit: (text: string, name: string) => void;
    onClose: () => void;
}

/**
 * Flatten the category tree for filtering/searching.
 */
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

/**
 * Find all circuits matching a search term (case-insensitive).
 */
function searchCircuits(
    entries: CircuitEntry[],
    query: string
): CircuitEntry[] {
    if (!query.trim()) return entries;
    const q = query.toLowerCase();
    return entries.filter(
        (e) =>
            e.title.toLowerCase().includes(q) ||
            e.file.toLowerCase().includes(q)
    );
}

/**
 * Get the full category path as a string for display.
 */
function getCategoryPath(
    categories: CircuitCategory[],
    targetName: string,
    path: string[] = []
): string | null {
    for (const cat of categories) {
        const current = [...path, cat.name];
        if (cat.name === targetName) return current.join(' > ');
        const found = getCategoryPath(cat.subcategories, targetName, current);
        if (found) return found;
    }
    return null;
}

const styles: Record<string, React.CSSProperties> = {
    container: {
        display: 'flex',
        flexDirection: 'column',
        height: '480px',
        fontFamily: 'monospace',
        fontSize: '13px',
        color: '#CCC',
    },
    searchBar: {
        padding: '8px',
        borderBottom: '1px solid #333',
    },
    searchInput: {
        width: '100%',
        padding: '6px 8px',
        backgroundColor: '#1a1a1a',
        border: '1px solid #444',
        borderRadius: '3px',
        color: '#FFF',
        fontFamily: 'monospace',
        fontSize: '13px',
        outline: 'none',
        boxSizing: 'border-box' as const,
    },
    main: {
        display: 'flex',
        flex: 1,
        overflow: 'hidden',
    },
    categoryPanel: {
        width: '180px',
        borderRight: '1px solid #333',
        overflowY: 'auto',
        flexShrink: 0,
    },
    circuitPanel: {
        flex: 1,
        overflowY: 'auto',
    },
    categoryItem: {
        padding: '6px 10px',
        cursor: 'pointer',
        color: '#AAA',
        borderLeft: '3px solid transparent',
        userSelect: 'none' as const,
    },
    categoryItemActive: {
        padding: '6px 10px',
        cursor: 'pointer',
        color: '#FFF',
        borderLeft: '3px solid #4CAF50',
        backgroundColor: '#222',
        userSelect: 'none' as const,
    },
    subcategoryItem: {
        padding: '4px 10px 4px 24px',
        cursor: 'pointer',
        color: '#888',
        fontSize: '12px',
        borderLeft: '3px solid transparent',
        userSelect: 'none' as const,
    },
    subcategoryItemActive: {
        padding: '4px 10px 4px 24px',
        cursor: 'pointer',
        color: '#FFF',
        fontSize: '12px',
        borderLeft: '3px solid #4CAF50',
        backgroundColor: '#222',
        userSelect: 'none' as const,
    },
    circuitItem: {
        padding: '8px 12px',
        cursor: 'pointer',
        borderBottom: '1px solid #2a2a2a',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    circuitItemHover: {
        backgroundColor: '#2a2a2a',
    },
    circuitTitle: {
        color: '#DDD',
    },
    circuitFile: {
        color: '#555',
        fontSize: '11px',
    },
    emptyState: {
        padding: '20px',
        textAlign: 'center',
        color: '#666',
    },
    loadingState: {
        padding: '20px',
        textAlign: 'center',
        color: '#888',
    },
    errorState: {
        padding: '20px',
        textAlign: 'center',
        color: '#f44',
    },
    categoryHeader: {
        padding: '6px 10px',
        color: '#888',
        fontSize: '11px',
        textTransform: 'uppercase' as const,
        letterSpacing: '1px',
        borderBottom: '1px solid #2a2a2a',
    },
    categoryCount: {
        color: '#555',
        fontSize: '11px',
    },
};

export function ExampleBrowser({ onLoadCircuit, onClose }: ExampleBrowserProps) {
    const [setupList, setSetupList] = useState<SetupList | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [loadingCircuit, setLoadingCircuit] = useState<string | null>(null);

    // Load setup list on mount
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

    // Build flat list of all circuits
    const allEntries = useMemo(
        () => (setupList ? flattenCircuits(setupList.categories) : []),
        [setupList]
    );

    // Group circuits by category for display
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

    // Get top-level category names with child counts
    const topLevelCategories = useMemo(() => {
        if (!setupList) return [];
        return setupList.categories.map((cat) => {
            const total = cat.circuits.length + flattenCircuits(cat.subcategories).length;
            return { name: cat.name, count: total };
        });
    }, [setupList]);

    // Compute which circuits to show
    const displayedCircuits = useMemo(() => {
        let entries: CircuitEntry[];

        if (searchQuery.trim()) {
            // In search mode, search across everything
            entries = searchCircuits(allEntries, searchQuery);
        } else if (selectedCategory) {
            // Show circuits for the selected category (or its first subcategory)
            entries = categoryCircuits.get(selectedCategory) ?? [];
        } else {
            // Default: show first category
            const firstKey = categoryCircuits.keys().next().value;
            entries = firstKey ? (categoryCircuits.get(firstKey) ?? []) : [];
        }

        return entries;
    }, [allEntries, categoryCircuits, selectedCategory, searchQuery]);

    // Handle clicking a circuit
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

    // When no search and no category selected, auto-select first available
    useEffect(() => {
        if (!searchQuery && !selectedCategory && categoryCircuits.size > 0) {
            const firstKey = categoryCircuits.keys().next().value;
            if (firstKey) setSelectedCategory(firstKey);
        }
    }, [categoryCircuits, searchQuery, selectedCategory]);

    if (loading) {
        return (
            <div style={styles.container}>
                <div style={styles.loadingState}>Loading circuit library...</div>
            </div>
        );
    }

    if (error && !setupList) {
        return (
            <div style={styles.container}>
                <div style={styles.errorState}>Error: {error}</div>
            </div>
        );
    }

    // Build a list of all category keys for rendering
    const categoryKeys = useMemo(() => Array.from(categoryCircuits.keys()), [categoryCircuits]);

    return (
        <div style={styles.container}>
            {/* Search bar */}
            <div style={styles.searchBar}>
                <input
                    style={styles.searchInput}
                    type="text"
                    placeholder="Search circuits..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        if (e.target.value) setSelectedCategory(null);
                    }}
                    autoFocus
                />
            </div>

            {/* Main panel */}
            <div style={styles.main}>
                {/* Category sidebar */}
                <div style={styles.categoryPanel}>
                    {categoryKeys.map((key) => {
                        const parts = key.split(' > ');
                        const isTopLevel = parts.length === 1;
                        const isActive = key === selectedCategory;

                        return isTopLevel ? (
                            <div
                                key={key}
                                style={isActive ? styles.categoryItemActive : styles.categoryItem}
                                onClick={() => {
                                    setSelectedCategory(key);
                                    setSearchQuery('');
                                }}
                            >
                                {parts[0]}
                                <span style={styles.categoryCount}>
                                    {' '}({categoryCircuits.get(key)?.length ?? 0})
                                </span>
                            </div>
                        ) : (
                            <div
                                key={key}
                                style={isActive ? styles.subcategoryItemActive : styles.subcategoryItem}
                                onClick={() => {
                                    setSelectedCategory(key);
                                    setSearchQuery('');
                                }}
                            >
                                {parts[parts.length - 1]}
                                <span style={styles.categoryCount}>
                                    {' '}({categoryCircuits.get(key)?.length ?? 0})
                                </span>
                            </div>
                        );
                    })}
                </div>

                {/* Circuit list */}
                <div style={styles.circuitPanel}>
                    {displayedCircuits.length === 0 ? (
                        <div style={styles.emptyState}>
                            {searchQuery
                                ? `No circuits matching "${searchQuery}"`
                                : 'No circuits in this category'}
                        </div>
                    ) : (
                        displayedCircuits.map((entry) => (
                            <div
                                key={entry.file}
                                style={styles.circuitItem}
                                onClick={() => handleCircuitClick(entry)}
                                onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = '#2a2a2a';
                                }}
                                onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                                }}
                            >
                                <span style={styles.circuitTitle}>{entry.title}</span>
                                <span style={styles.circuitFile}>
                                    {loadingCircuit === entry.file ? 'Loading...' : entry.file}
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
