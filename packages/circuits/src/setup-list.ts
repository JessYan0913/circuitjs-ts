/**
 * Represents a single circuit entry from the setup list.
 */
export interface CircuitEntry {
    /** The circuit filename (e.g., "ohms.txt") */
    file: string;
    /** Display title (e.g., "Ohm's Law") */
    title: string;
    /** Whether this is the default/first circuit in its category (prefixed with >) */
    isDefault: boolean;
}

/**
 * Represents a category node in the circuit browser tree.
 */
export interface CircuitCategory {
    /** Display name of the category */
    name: string;
    /** Direct circuit entries in this category */
    circuits: CircuitEntry[];
    /** Nested subcategories */
    subcategories: CircuitCategory[];
}

/**
 * The full parsed result of the setup list.
 */
export interface SetupList {
    /** Tree structure of categories */
    categories: CircuitCategory[];
    /** Flat list of all circuits for search/lookup */
    allCircuits: CircuitEntry[];
    /** Map from filename to title */
    fileToTitle: Record<string, string>;
}

/**
 * Parse a setuplist.txt string into a structured SetupList object.
 *
 * Format:
 *   # comment line (skip)
 *   +CategoryName       — start a new category (push)
 *   -                   — pop back to parent category
 *   filename.txt Title  — add a circuit entry to current category
 *   >filename.txt Title — add a default circuit entry (shown on category click)
 *   blank lines skipped
 */
export function parseSetupList(text: string): SetupList {
    const categories: CircuitCategory[] = [];
    const allCircuits: CircuitEntry[] = [];
    const fileToTitle: Record<string, string> = {};

    // Stack represents the current path in the category tree.
    // Each element is a CircuitCategory that we're currently building.
    const stack: CircuitCategory[] = [];
    let root: CircuitCategory = { name: '', circuits: [], subcategories: [] };

    const lines = text.split(/\r?\n/);

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const firstChar = line.charAt(0);

        if (firstChar === '#') {
            // Comment line — skip
            continue;
        }

        if (firstChar === '+') {
            // Start a new category
            const name = line.substring(1).trim();
            const cat: CircuitCategory = { name, circuits: [], subcategories: [] };

            if (stack.length === 0) {
                // Top-level category
                root.subcategories.push(cat);
            } else {
                const current = stack[stack.length - 1];
                current.subcategories.push(cat);
            }
            stack.push(cat);
            continue;
        }

        if (firstChar === '-') {
            // Pop back one level
            if (stack.length > 0) {
                stack.pop();
            }
            continue;
        }

        // Otherwise: a circuit entry (may start with '>' for default)
        const isDefault = firstChar === '>';
        const entryLine = isDefault ? line.substring(1).trim() : line;

        const spaceIdx = entryLine.indexOf(' ');
        if (spaceIdx <= 0) continue; // no space found, malformed line

        const file = entryLine.substring(0, spaceIdx);
        const title = entryLine.substring(spaceIdx + 1).trim();
        if (!file || !title) continue;

        const entry: CircuitEntry = { file, title, isDefault };

        if (stack.length > 0) {
            const current = stack[stack.length - 1];
            current.circuits.push(entry);
        } else {
            // Orphan circuit at root level (shouldn't happen in practice)
            root.circuits.push(entry);
        }

        allCircuits.push(entry);
        fileToTitle[file] = title;
    }

    // Flatten any root-level circuits into a synthetic "Other" category
    // but also keep them under categories from subcategories
    return {
        categories: root.subcategories,
        allCircuits,
        fileToTitle,
    };
}

/**
 * Read and parse the setuplist.txt file.
 * In a browser context, this would be fetched via HTTP.
 */
export async function fetchAndParseSetupList(
    url: string = '/setuplist.txt'
): Promise<SetupList> {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to load setuplist.txt: ${response.statusText}`);
    }
    const text = await response.text();
    return parseSetupList(text);
}

/**
 * Load a circuit file content from the server.
 */
export async function fetchCircuitFile(file: string): Promise<string> {
    const response = await fetch(`/circuits/${file}`);
    if (!response.ok) {
        throw new Error(`Failed to load circuit ${file}: ${response.statusText}`);
    }
    return response.text();
}
