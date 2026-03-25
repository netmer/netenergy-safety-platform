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
