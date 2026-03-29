/**
 * Distributes nurses evenly across divisions for a given shift
 * Ensures fair distribution so each division is represented equally
 */
export function distributeNursesByDivision(nursesGroupedByDivision) {
  /**
   * Input: Object with division_id as key, array of nurses as value
   * Example:
   * {
   *   "divId1": [nurse1, nurse2, nurse3],
   *   "divId2": [nurse4, nurse5],
   *   "divId3": [nurse6]
   * }
   * 
   * Output: Array of nurses distributed evenly across divisions
   * Example: [nurse1, nurse4, nurse6, nurse2, nurse5, nurse3, ...]
   */

  const divisions = Object.keys(nursesGroupedByDivision);
  if (divisions.length === 0) return [];

  const distributed = [];
  const indices = {};
  divisions.forEach(div => {
    indices[div] = 0;
  });

  let maxLength = 0;
  divisions.forEach(div => {
    maxLength = Math.max(maxLength, nursesGroupedByDivision[div].length);
  });

  // Round-robin distribution: pick one nurse from each division in sequence
  for (let i = 0; i < maxLength; i++) {
    for (const divId of divisions) {
      const nurses = nursesGroupedByDivision[divId];
      if (indices[divId] < nurses.length) {
        distributed.push(nurses[indices[divId]]);
        indices[divId] += 1;
      }
    }
  }

  return distributed;
}

/**
 * Groups nurses by their division
 */
export function groupNursesByDivision(nurses) {
  const grouped = {};
  nurses.forEach(nurse => {
    const divId = nurse.division_id ? nurse.division_id.toString() : "no_division";
    if (!grouped[divId]) {
      grouped[divId] = [];
    }
    grouped[divId].push(nurse);
  });
  return grouped;
}

/**
 * Creates balanced shift schedule entries for a department
 * Distributes nurses from different divisions evenly across shifts
 */
export function createBalancedScheduleEntries(
  nursesInDept,
  department_id,
  days,
  shifts,
  week_number,
  year,
  creator_id
) {
  const entries = [];

  // Group nurses by division
  const nursesByDivision = groupNursesByDivision(nursesInDept);
  
  // For each day and shift, distribute nurses from different divisions
  let divisionRotation = 0;

  for (const day of days) {
    for (const shift of shifts) {
      // Get one nurse from each division in round-robin fashion
      const divisions = Object.keys(nursesByDivision);
      
      // Create a rotation to pick from divisions
      let nursesForThisShift = [];
      
      for (const divId of divisions) {
        const divisionNurses = nursesByDivision[divId];
        if (divisionNurses.length > 0) {
          // Calculate which nurse from this division to use
          const nurseIndexInDivision = Math.floor(divisionRotation / divisions.length) % divisionNurses.length;
          nursesForThisShift.push(divisionNurses[nurseIndexInDivision]);
        }
      }

      // If no nurses from division-based distribution, fall back to simple round-robin
      if (nursesForThisShift.length === 0) {
        const distrib = distributeNursesByDivision(nursesByDivision);
        if (distrib.length > 0) {
          const idx = divisionRotation % distrib.length;
          nursesForThisShift = [distrib[idx]];
        }
      }

      // Add entry for each nurse selected for this shift
      nursesForThisShift.forEach(nurse => {
        entries.push({
          nurse_id: nurse._id,
          department_id,
          duty_date: day,
          shift_type: shift,
          week_number,
          year,
          created_by: creator_id,
        });
      });

      divisionRotation += 1;
    }
  }

  return entries;
}
