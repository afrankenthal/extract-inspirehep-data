import React, { useState, useEffect } from 'react';
import styles from './index.module.css'; // Import the CSS module

// Helper to load experiments.json (assumes it's in public folder)
const fetchExperiments = async () => {
    const res = await fetch('/experiments.json');
    if (!res.ok) throw new Error('Failed to load experiments.json');
    return res.json();
};

const Home: React.FC = () => {
    const [experiments, setExperiments] = useState<any[]>([]);
    const [filteredExperiments, setFilteredExperiments] = useState<any[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [editedEntry, setEditedEntry] = useState<any>({});
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [minPapers, setMinPapers] = useState<number>(0);
    const [schema, setSchema] = useState<any>(null);

    useEffect(() => {
        fetchExperiments().then(data => {
            setExperiments(data);
        });
    }, []);

    useEffect(() => {
        fetch('/schema.json')
            .then(res => res.json())
            .then(setSchema)
            .catch(() => setSchema(null));
    }, []);

    // Filter experiments when experiments or minPapers changes
    useEffect(() => {
        const filtered = experiments.filter(exp => {
            return typeof exp.number_of_papers === 'number' && exp.number_of_papers >= minPapers;
        });
        setFilteredExperiments(filtered);
        setCurrentIdx(0);
        setEditedEntry(filtered[0] || {});
        setSelected(new Set());
    }, [experiments, minPapers]);


    const handleFieldChange = (field: string, value: string) => {
        setEditedEntry((prev: any) => ({
            ...prev,
            [field]: value,
        }));
    };

    const handlePrev = () => {
        if (currentIdx > 0) {
            setCurrentIdx(idx => {
                setEditedEntry({ ...filteredExperiments[idx - 1] });
                return idx - 1;
            });
        }
    };

    const handleNext = () => {
        if (currentIdx < filteredExperiments.length - 1) {
            setCurrentIdx(idx => {
                setEditedEntry({ ...filteredExperiments[idx + 1] });
                return idx + 1;
            });
        }
    };

    const handleSelect = () => {
        setSelected(prev => {
            const newSet = new Set(prev);
            newSet.add(currentIdx);
            return newSet;
        });
    };

    const handleDeselect = () => {
        setSelected(prev => {
            const newSet = new Set(prev);
            newSet.delete(currentIdx);
            return newSet;
        });
    };

    const handleSave = () => {
        setFilteredExperiments(prev => {
            const updated = [...prev];
            updated[currentIdx] = { ...editedEntry };
            return updated;
        });
    };

    const handleDownload = () => {
        const output = Array.from(selected).map(idx => filteredExperiments[idx]);
        const blob = new Blob([JSON.stringify(output, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'selected_experiments.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    // Helper to fix a classification field
    const fixClassificationField = (entry: any, field: string) => {
        let value = entry[field];
        if (Array.isArray(value)) {
            value = value[0] || '';
        }
        if (typeof value === 'string') {
            return [value
                .split('|')
                .map(part => part.trim())
                .join(' > ')];
        }
        return value;
    };

    const fixClassifications = () => {
        const updated = { ...editedEntry };
        updated.inspire_classification = fixClassificationField(updated, 'inspire_classification');
        updated.facet_inspire_classification = fixClassificationField(updated, 'facet_inspire_classification');

        setEditedEntry(updated);

        setFilteredExperiments(prev => {
            const newFiltered = [...prev];
            newFiltered[currentIdx] = { ...updated };
            return newFiltered;
        });

        setExperiments(prevAll => {
            const newAll = [...prevAll];
            const filteredExp = filteredExperiments[currentIdx];
            let idxInAll = -1;
            if (filteredExp && filteredExp.id !== undefined) {
                idxInAll = prevAll.findIndex(exp => exp.id === filteredExp.id);
            }
            if (idxInAll === -1 && filteredExp) {
                idxInAll = prevAll.findIndex(exp => exp === filteredExp);
            }
            if (idxInAll !== -1) {
                newAll[idxInAll] = { ...updated };
            }
            return newAll;
        });
    };

    const renderField = (
        key: string,
        prop: any,
        value: any,
        onChange: (newValue: any) => void,
        path: string[] = []
    ) => {
        // Helper to build a unique key for nested fields
        const fieldKey = [...path, key].join('.');

        // Handle arrays
        if (prop.type === 'array') {
            // Check if schema says array of objects, or if the data is an array of objects
            const isArrayOfObjects =
                (prop.items && prop.items.type === 'object') ||
                (Array.isArray(value) && value.length > 0 && typeof value[0] === 'object' && value[0] !== null);

            if (isArrayOfObjects) {
                return (
                    <div key={fieldKey} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: '2px solid #eee' }}>
                        <label style={{ fontWeight: 600 }}>{key}</label>
                        {(Array.isArray(value) ? value : []).map((item, idx) => (
                            <div key={idx} style={{ marginBottom: 8, background: '#f9fafb', padding: 8, borderRadius: 4 }}>
                                {Object.entries(
                                    (prop.items && prop.items.properties) || item // fallback to item keys if schema missing
                                ).map(([subKey, subProp]: [string, any]) =>
                                    renderField(
                                        subKey,
                                        (prop.items && prop.items.properties && prop.items.properties[subKey]) || { type: typeof item[subKey] },
                                        item?.[subKey] ?? '',
                                        newVal => {
                                            const newArr = [...value];
                                            newArr[idx] = { ...newArr[idx], [subKey]: newVal };
                                            onChange(newArr);
                                        },
                                        [...path, key, String(idx)]
                                    )
                                )}
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={() => onChange([...(Array.isArray(value) ? value : []), {}])}
                            style={{ fontSize: 12, marginTop: 4 }}
                        >
                            + Add {key}
                        </button>
                    </div>
                );
            }
            // Array of primitives
            return (
                <div key={fieldKey} style={{ marginBottom: 12 }}>
                    <label style={{ fontWeight: 600 }}>{key}</label>
                    {(Array.isArray(value) ? value : []).map((item, idx) => (
                        <input
                            key={idx}
                            type="text"
                            value={item}
                            onChange={e => {
                                const updatedArr = Array.isArray(value) ? [...value] : [];
                                updatedArr[idx] = e.target.value;
                                onChange(updatedArr);
                            }}
                            style={{ width: '100%', padding: 6, marginBottom: 4 }}
                        />
                    ))}
                    <button
                        type="button"
                        onClick={() => onChange([...(Array.isArray(value) ? value : []), ""])}
                        style={{ fontSize: 12, marginTop: 4 }}
                    >
                        + Add {key}
                    </button>
                </div>
            );
        }

        // Handle objects (dictionaries)
        if (prop.type === 'object' && prop.properties) {
            return (
                <div key={fieldKey} style={{ marginBottom: 12, paddingLeft: 12, borderLeft: '2px solid #eee' }}>
                    <label style={{ fontWeight: 600 }}>{key}</label>
                    {Object.entries(prop.properties).map(([subKey, subProp]: [string, any]) =>
                        renderField(
                            subKey,
                            subProp,
                            value?.[subKey] ?? '',
                            newVal => onChange({ ...value, [subKey]: newVal }),
                            [...path, key]
                        )
                    )}
                </div>
            );
        }

        // Handle primitive types
        return (
            <div key={fieldKey} style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontWeight: 600 }}>{key}</label>
                <input
                    type="text"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    style={{ width: '100%', padding: 6 }}
                />
            </div>
        );
    };

    if (!filteredExperiments.length) {
        return (
            <div style={{ maxWidth: 600, margin: '2rem auto', padding: 20 }}>
                <div>
                    <label>
                        Minimum number_of_papers:{' '}
                        <input
                            type="number"
                            min={0}
                            value={minPapers}
                            onChange={e => setMinPapers(Number(e.target.value))}
                            style={{ width: 60 }}
                        />
                    </label>
                </div>
                <div style={{ marginTop: 20 }}>No experiments found with at least {minPapers} papers.</div>
            </div>
        );
    }

    const isSelected = selected.has(currentIdx);

    return (
        <div className={styles.container}>
            {/* Sidebar list */}
            <div className={styles.sidebar}>
                <div className={styles.sidebarTitle}>Entries</div>
                <ul className={styles.sidebarList}>
                    {filteredExperiments.map((exp, idx) => (
                        <li
                            key={idx}
                            className={[
                                styles.sidebarItem,
                                idx === currentIdx ? styles.currentItem : '',
                                selected.has(idx) ? styles.selectedItem : ''
                            ].join(' ')}
                            title={exp.legacy_name || exp.name || exp.id || `Entry ${idx + 1}`}
                            onClick={() => {
                                setCurrentIdx(idx);
                                setEditedEntry({ ...filteredExperiments[idx] });
                            }}
                        >
                            <span
                                className={styles.sidebarItemLabel}
                                onClick={() => setCurrentIdx(idx)}
                            >
                                {(exp.legacy_name || exp.name || exp.id || `Entry ${idx + 1}`) +
                                    (typeof exp.number_of_papers === 'number' ? ` (${exp.number_of_papers})` : '')}
                            </span>
                            {selected.has(idx) ? (
                                <button
                                    className={styles.deselectButton}
                                    onClick={e => {
                                        e.stopPropagation();
                                        setSelected(prev => {
                                            const newSet = new Set(prev);
                                            newSet.delete(idx);
                                            return newSet;
                                        });
                                    }}
                                    title="Deselect"
                                >
                                    ✓
                                </button>
                            ) : (
                                <button
                                    className={styles.selectButton}
                                    onClick={e => {
                                        e.stopPropagation();
                                        setSelected(prev => {
                                            const newSet = new Set(prev);
                                            newSet.add(idx);
                                            return newSet;
                                        });
                                    }}
                                    title="Select"
                                >
                                    +
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
            {/* Main content */}
            <div className={styles.mainContent}>
                <h1>Review Experiments</h1>
                <div className={styles.filterRow}>
                    <label>
                        Minimum number_of_papers:{' '}
                        <input
                            type="number"
                            min={0}
                            value={minPapers}
                            onChange={e => setMinPapers(Number(e.target.value))}
                            className={styles.inputNumber}
                        />
                    </label>
                </div>
                <div className={styles.navigationRow}>
                    <button onClick={handlePrev} disabled={currentIdx === 0}>Previous</button>
                    <span style={{ margin: '0 1rem' }}>
                        {currentIdx + 1} / {filteredExperiments.length}
                    </span>
                    <button onClick={handleNext} disabled={currentIdx === filteredExperiments.length - 1}>Next</button>
                </div>
                <form className={styles.form}>
                    {schema
                        ? Object.entries(schema.properties).map(([key, prop]: [string, any]) =>
                            renderField(
                                key,
                                prop,
                                editedEntry[key] ?? (prop.type === 'array' ? [] : prop.type === 'object' ? {} : ''),
                                newValue => setEditedEntry((prev: any) => ({ ...prev, [key]: newValue }))
                            )
                        )
                        : <div>Loading schema...</div>
                    }
                </form>
                <div className={styles.actionRow}>
                    <button onClick={handleSave}>Save Edits</button>
                    <button
                        style={{ marginLeft: 8 }}
                        onClick={fixClassifications}
                        type="button"
                    >
                        Fix inspire_classification & facet_inspire_classification
                    </button>
                    {isSelected ? (
                        <button style={{ marginLeft: 8 }} onClick={handleDeselect}>Deselect</button>
                    ) : (
                        <button style={{ marginLeft: 8 }} onClick={handleSelect}>Select</button>
                    )}
                </div>
                <div className={styles.downloadRow}>
                    <button onClick={handleDownload} disabled={selected.size === 0}>
                        Download Selected ({selected.size})
                    </button>
                </div>
                <div className={styles.selectAllRow}>
                    <button
                        onClick={() => {
                            setSelected(new Set(filteredExperiments.map((_, idx) => idx)));
                        }}
                        className={styles.selectAllButton}
                    >
                        Select All
                    </button>
                    <button
                        onClick={() => setSelected(new Set())}
                        className={styles.deselectAllButton}
                    >
                        Deselect All
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Home;