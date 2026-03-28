/** Validate Thai National ID using the 13-digit check digit algorithm */
export function validateThaiID(id: string): boolean {
    if (!/^[0-9]{13}$/.test(id)) return false;
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(id.charAt(i)) * (13 - i);
    }
    const checkDigit = (11 - (sum % 11)) % 10;
    return checkDigit === parseInt(id.charAt(12));
}

/**
 * Build a full display name from title + firstName + lastName.
 * Thai convention: title attaches directly to firstName (no space), then space before lastName.
 * e.g. buildFullName("นาย", "สมชาย", "รักงาน") → "นายสมชาย รักงาน"
 */
export function buildFullName(
    title?: string | null,
    firstName?: string | null,
    lastName?: string | null
): string {
    const t = (title ?? '').trim();
    const f = (firstName ?? '').trim();
    const l = (lastName ?? '').trim();
    if (!f && !l) return t;
    if (!l) return t ? `${t}${f}` : f;
    return t ? `${t}${f} ${l}` : `${f} ${l}`;
}

/**
 * Best-effort parser for old combined fullName strings that lack separate fields.
 * Detects known Thai title prefixes and splits accordingly.
 * e.g. "นายสมชาย รักงาน" → { title: "นาย", firstName: "สมชาย", lastName: "รักงาน" }
 */
export function parseFullName(fullName: string): { title: string; firstName: string; lastName: string } {
    const thaiTitles = ['นางสาว', 'นาย', 'นาง', 'ดร.', 'ผศ.ดร.', 'รศ.ดร.', 'ศ.ดร.', 'ผศ.', 'รศ.', 'ศ.', 'พ.ต.', 'พ.ท.', 'พ.อ.', 'ร.ต.', 'ร.ท.', 'ร.อ.', 'น.ต.', 'น.ท.', 'น.อ.'];
    const s = fullName.trim();
    for (const t of thaiTitles) {
        if (s.startsWith(t)) {
            const rest = s.slice(t.length).trim();
            const spaceIdx = rest.indexOf(' ');
            if (spaceIdx === -1) return { title: t, firstName: rest, lastName: '' };
            return { title: t, firstName: rest.slice(0, spaceIdx), lastName: rest.slice(spaceIdx + 1) };
        }
    }
    // No title prefix found
    const spaceIdx = s.indexOf(' ');
    if (spaceIdx === -1) return { title: '', firstName: s, lastName: '' };
    return { title: '', firstName: s.slice(0, spaceIdx), lastName: s.slice(spaceIdx + 1) };
}

/**
 * Get a display name from a TrainingRecord or similar object.
 * Uses separate fields if available, falls back to the combined attendeeName.
 */
export function getAttendeeName(record: {
    attendeeName: string;
    attendeeTitle?: string;
    attendeeFirstName?: string;
    attendeeLastName?: string;
}): string {
    if (record.attendeeFirstName || record.attendeeLastName) {
        return buildFullName(record.attendeeTitle, record.attendeeFirstName, record.attendeeLastName);
    }
    return record.attendeeName;
}
