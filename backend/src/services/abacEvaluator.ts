export function maskValue(value: string | null | undefined, maskPattern: string): string {
  if (!value) return '';

  const match = maskPattern.match(/\$\{(\d+)\}.*\$\{(\d+)\}/);
  if (!match) {
    const keepStart = 3;
    const keepEnd = 4;
    if (value.length <= keepStart + keepEnd) {
      return '*'.repeat(value.length);
    }
    return value.substring(0, keepStart) + '****' + value.substring(value.length - keepEnd);
  }

  const startChars = parseInt(match[1]);
  const endChars = parseInt(match[2]);
  
  if (value.length <= startChars + endChars) {
    return '*'.repeat(value.length);
  }

  return value.substring(0, startChars) + '****' + value.substring(value.length - endChars);
}

export function applyFieldMasking(data: any[], fieldPermissions: any[]): any[] {
  if (fieldPermissions.length === 0 || !Array.isArray(data)) return data;

  const maskMap = new Map<string, string>();
  fieldPermissions.forEach(fp => {
    if (fp.fieldName && fp.fieldMask) {
      maskMap.set(fp.fieldName, fp.fieldMask);
    }
  });

  if (maskMap.size === 0) return data;

  return data.map(item => {
    const masked = { ...item };
    maskMap.forEach((maskPattern, fieldName) => {
      if (masked[fieldName] !== undefined) {
        masked[fieldName] = maskValue(masked[fieldName], maskPattern);
      }
    });
    return masked;
  });
}
