export interface ParsedSubject {
  name: string;
  total: number;
  present: number;
  absent: number;
  percentage: number;
  code?: string; // detected subject code if available (e.g., 21CSC201J or CL)
}

const pct = (present: number, total: number) => (total > 0 ? (present / total) * 100 : 0);

// Heuristics:
// - Accept labels: TH or TC (total), PH (present), AH (absent). Case-insensitive. Optional separators ':' or '-'.
// - If labels missing on a line but there are 2+ numbers: largest => total, next => present; absent inferred.
// - If present+total present, compute absent. If absent+total present, compute present.
// - Subject name: text before the first label or number on the line; if none, auto-generate.
export function parseAttendanceText(text: string): ParsedSubject[] {
  // Build legend map if available: Code -> Full Name
  const allLines = text.split(/\r?\n/).map((l) => l.trim());
  const legendIdx = allLines.findIndex((l) => /^\s*legend\s*:/i.test(l));
  const legendMap: Record<string, string> = {};
  if (legendIdx >= 0) {
    for (let i = legendIdx + 1; i < allLines.length; i++) {
      const line = allLines[i];
      if (!line) continue;
      const m = line.match(/^(\S[\S ]*?)\s*[-–:]\s*(.+)$/); // "CODE - NAME"
      if (m) {
        const left = m[1].trim();
        const right = m[2].trim();
        // pick a code-like token from left side (alnum >=5) or 'CL'
        const codeLike = left.match(/\b(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{5,}\b/);
        const clLike = /^CL$/i.test(left) ? ['CL'] as any : null;
        const key = (codeLike && codeLike[0]) || (clLike && 'CL');
        if (key) legendMap[key.toUpperCase()] = right.toUpperCase() === 'CLASS IN CHARGE' ? 'CL' : right;
      }
    }
  }
  // Pre-clean parse area: only before LEGEND and drop last-updated
  const beforeLegend = legendIdx >= 0 ? allLines.slice(0, legendIdx) : allLines;
  const cleaned = beforeLegend.filter((l) => !/last\s*updated/i.test(l)).join('\n');

  const lines = cleaned
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const subjects: ParsedSubject[] = [];
  let autoIndex = 1;

  const labelRegexes = {
    total: /(\b(?:th|tc|total)\b)\s*[:\-]?\s*(\d+)/i,
    present: /(\b(?:ph|present)\b)\s*[:\-]?\s*(\d+)/i,
    absent: /(\b(?:ah|absent)\b)\s*[:\-]?\s*(\d+)/i,
  } as const;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];
    // Skip header-like lines
    if (/^code\b/i.test(line)) continue;
    if (/^th\b|^tc\b|^ph\b|^ah\b|^%\b/i.test(line)) continue;
    if (/^description\b/i.test(line)) continue;
    if (/^max\.?\s*hours?/i.test(line)) continue;
    if (/^att\.?\s*hours?/i.test(line)) continue;
    if (/^absent\b/i.test(line)) continue;
    if (/^average\b/i.test(line)) continue;
    if (/^od\/?ml/i.test(line)) continue;
    if (/^total\b/i.test(line)) continue; // portal total summary row
    // Skip lines with no letters at all (likely timestamps or status bar)
    if (!/[a-zA-Z]/.test(line)) continue;

    // Portal-style row: Description [words] then 3+ numbers (total/present/absent ...)
    // Example: DATA STRUCTURES AND ALGORITHMS 23 17 6 73.91 0.00
    const portalMatch = line.match(/^(.*?)\s+(\d+)\s+(\d+)\s+(\d+)(?:\s+\d+(?:\.\d+)?(?:\s+\d+(?:\.\d+)?)?)?\s*$/i);
    if (portalMatch) {
      const name = portalMatch[1].trim().replace(/\s{2,}/g, ' ');
      const total = Number(portalMatch[2]);
      const present = Number(portalMatch[3]);
      const absent = Number(portalMatch[4]);
      if (name && total >= 0 && present >= 0 && absent >= 0 && present <= total && absent <= total) {
        subjects.push({ name, total, present, absent, percentage: pct(present, total) });
        continue;
      }
    }

    // Fast-path: explicit CL row detection (handles cL/Cl/CL with optional punctuation)
    const clFastMatch = line.match(/^\s*cl\b[\s:–\-]*((?:\d+\s+){2,3})(?:\d+(?:\.\d+)?\s*%\s*)?$/i);
    if (clFastMatch) {
      const numSeq = clFastMatch[1];
      const parts = (numSeq.match(/\d+/g) || []).map(Number);
      if (parts.length >= 2) {
        let total = 0, present = 0, absent = 0;
        if (parts.length >= 3) {
          // Assume order TH PH AH
          total = parts[0]; present = parts[1]; absent = parts[2];
        } else {
          // Two numbers: choose largest as total, other as present
          total = Math.max(parts[0], parts[1]);
          present = Math.min(parts[0], parts[1]);
          absent = Math.max(0, total - present);
        }
        const percentage = pct(present, total);
        const displayName = legendMap['CL'] || 'CL';
        subjects.push({ name: displayName, total, present, absent, percentage, code: 'CL' });
        continue;
      }
    }

    let total: number | undefined;
    let present: number | undefined;
    let absent: number | undefined;

    const tMatch = line.match(labelRegexes.total);
    const pMatch = line.match(labelRegexes.present);
    const aMatch = line.match(labelRegexes.absent);

    // Detect presence of a plausible subject code token (letters+digits, length >= 5)
    const subjectTokenRegex = /\b(?=[A-Za-z0-9]*[A-Za-z])(?=[A-Za-z0-9]*\d)[A-Za-z0-9]{5,}\b/;
    let hasSubjectToken = subjectTokenRegex.test(line);
    let _codeToken: string | null = null;

    if (tMatch) total = Number(tMatch[2]);
    if (pMatch) present = Number(pMatch[2]);
    if (aMatch) absent = Number(aMatch[2]);

    // Subject name heuristic: take text up to first label/number
    const firstLabelIndex = [tMatch?.index ?? Infinity, pMatch?.index ?? Infinity, aMatch?.index ?? Infinity].reduce(
      (a, b) => Math.min(a, b),
      Infinity
    );
    let name = line.substring(0, isFinite(firstLabelIndex) ? firstLabelIndex : 0).trim();

    // If name empty, try to capture leading word(s) before first number
    if (!name) {
      const numIndex = line.search(/\d/);
      if (numIndex > 0) {
        name = line.substring(0, numIndex).trim();
        // If this looks like a short subject code, mark as subject token present
        if (/^[A-Za-z]{2,6}$/.test(name)) {
          hasSubjectToken = true;
        }
      }
    }

    // Additional heuristic: prefer token that looks like a subject code (letters+digits)
    if (!name) {
      const rawTokens = line.split(/\s+/).map((t) => t.trim()).filter(Boolean);
      const stripped = rawTokens.map((t) => t.replace(/[^A-Za-z0-9]/g, ''));
      // Merge adjacent single-letter tokens into a single code, e.g., ['C','L'] -> ['CL']
      const merged: string[] = [];
      for (let i = 0; i < stripped.length; i++) {
        const tok = stripped[i];
        if (/^[A-Za-z]$/.test(tok)) {
          let j = i;
          let acc = '';
          while (j < stripped.length && /^[A-Za-z]$/.test(stripped[j])) {
            acc += stripped[j];
            j++;
          }
          merged.push(acc);
          i = j - 1;
        } else {
          merged.push(tok);
        }
      }
      const tokens = merged;
      const codeLike = tokens.find((tok) => subjectTokenRegex.test(tok));
      if (codeLike) {
        name = codeLike;
        _codeToken = codeLike.toUpperCase();
      } else {
        // Support short letter-only subject codes like 'CL', 'EE', 'CS' anywhere in the line
        const isHeaderToken = (tok: string) => /^(th|tc|ph|ah|total|present|absent|code|percent|pct)$/i.test(tok);
        // Prefer exact 'CL' if present
        const clToken = tokens.find((tok) => /^CL$/i.test(tok));
        const shortCode = clToken || tokens.find((tok) => /^[A-Za-z]{2,6}$/.test(tok) && !isHeaderToken(tok));
        if (shortCode) {
          name = shortCode;
          hasSubjectToken = true; // allow numeric parsing with short subject codes
          if (/^CL$/i.test(shortCode)) _codeToken = 'CL';
        }
      }
    }
    if (!name) {
      name = `Subject ${autoIndex++}`;
    }

    // If labels weren't found, fallback: pick numbers on the line (or the next line if current is only subject code)
    if (total === undefined && present === undefined && absent === undefined) {
      // Remove percentage tokens like "91.18 %" or "91%" to avoid picking them as totals
      const noPercent = line.replace(/\d+(?:\.\d+)?\s*%/g, '');
      let nums = (noPercent.match(/\b\d+\b/g) || []).map(Number);

      // If no numbers here but we have a subject token, try the next line for numbers
      if (nums.length < 3 && hasSubjectToken && idx + 1 < lines.length) {
        const nextLine = lines[idx + 1];
        const nextNoPercent = nextLine.replace(/\d+(?:\.\d+)?\s*%/g, '');
        const nextNums = (nextNoPercent.match(/\b\d+\b/g) || []).map(Number);
        if (nextNums.length >= 3 || nextNums.length === 2) {
          nums = nextNums;
          idx++; // consume next line as part of this subject
        }
      }
      if (nums.length >= 3) {
        if (!hasSubjectToken) {
          // Without labels and without a subject-like token, skip this numeric line
          continue;
        }
        // Prefer column order [TH/TC, PH, AH], but correct if out of order
        const [n0, n1, n2] = nums;
        const arr = [n0, n1, n2];
        const maxVal = Math.max(...arr);
        const idxMax = arr.indexOf(maxVal);
        const rem = arr.filter((_, idx) => idx !== idxMax);
        const t = maxVal;
        const p = Math.max(rem[0], rem[1]);
        let a = Math.min(rem[0], rem[1]);
        // Adjust absent to fit arithmetic if needed
        if (p + a !== t) {
          a = Math.max(0, t - p);
        }
        total = t; present = p; absent = a;
      } else if (nums.length === 2) {
        if (!hasSubjectToken) {
          // Avoid mis-parsing time/battery lines that have two numbers but no subject token
          continue;
        }
        // Use larger as total, next as present; infer absent
        const [a, b] = nums;
        if (a >= b) {
          total = a;
          present = b;
        } else {
          total = b;
          present = a;
        }
      } else if (nums.length === 1) {
        if (!hasSubjectToken) {
          continue;
        }
        // Single number; treat as total if we find keyword-like cue
        if (/\b(total|th|tc)\b/i.test(line)) total = nums[0];
        else if (/\b(present|ph)\b/i.test(line)) present = nums[0];
        else if (/\b(absent|ah)\b/i.test(line)) absent = nums[0];
        else total = nums[0];
      }
    }

    if (total === undefined && present === undefined && absent === undefined) {
      continue; // nothing parsable on this line
    }

    // Infer missing value
    if (total !== undefined && present !== undefined && absent === undefined) {
      absent = Math.max(0, total - present);
    } else if (total !== undefined && absent !== undefined && present === undefined) {
      present = Math.max(0, total - absent);
    } else if (present !== undefined && absent !== undefined && total === undefined) {
      total = present + absent;
    }

    // Final validation
    if (total === undefined || present === undefined || absent === undefined) {
      continue;
    }
    if (present > total || absent > total || present + absent !== total) {
      // try to correct if just off by OCR errors (e.g., 0/1 mistakes)
      if (present + absent <= total) {
        // Accept even if not exact, adjust absent to fit
        absent = Math.max(0, total - present);
      } else {
        // As last resort, set total to max(present+absent, total)
        total = Math.max(total, present + absent);
      }
    }

    // Sanity filters: discard unrealistic rows
    if (total > 300 || present > total || absent > total) {
      continue;
    }
    if (/^Subject\s+\d+$/i.test(name) && total > 200) {
      continue;
    }

    // Map display name via legend if we captured a code token; otherwise, reject junk short names (except CL)
    let displayName = name;
    if (_codeToken && legendMap[_codeToken]) {
      displayName = legendMap[_codeToken];
    } else if (/^[A-Za-z]{1,2}$/.test(displayName) && !/^CL$/i.test(displayName)) {
      // Keep the row; fallback to an auto-generated name rather than dropping it
      displayName = `Subject ${autoIndex++}`;
    }

    subjects.push({
      name: displayName,
      total,
      present,
      absent,
      percentage: pct(present, total),
      code: _codeToken || undefined,
    });
  }

  // If no labeled lines found but text includes an obvious overall triple, we could attempt aggregate.
  // De-duplicate by subject name, keep first occurrence
  const seen = new Set<string>();
  const deduped = subjects.filter((s) => {
    const key = s.name.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return deduped;
}
