export const calculateAttendancePercentage = (
  classesAttended: number,
  totalClasses: number
): number => {
  if (totalClasses === 0) return 0;
  return (classesAttended / totalClasses) * 100;
};

export const calculateClassesNeeded = (
  classesAttended: number,
  totalClasses: number,
  minimumPercentage: number = 75
): {
  canMissClasses: number;
  needToAttendClasses: number;
  currentPercentage: number;
  isAboveMinimum: boolean;
} => {
  const currentPercentage = calculateAttendancePercentage(classesAttended, totalClasses);
  const isAboveMinimum = currentPercentage >= minimumPercentage;

  const p = minimumPercentage / 100;

  // Calculate how many more classes need to be attended to reach minimum percentage
  // Solve for x in: (A + x) / (T + x) >= p  => x >= (pT - A) / (1 - p)
  if (!isAboveMinimum) {
    const numerator = p * totalClasses - classesAttended;
    const denominator = 1 - p;
    const x = numerator <= 0 ? 0 : Math.ceil(numerator / denominator);
    return {
      canMissClasses: 0,
      needToAttendClasses: Math.max(0, x),
      currentPercentage,
      isAboveMinimum,
    };
  }

  // Calculate how many classes can be missed while maintaining minimum percentage
  // Solve for y in: A / (T + y) >= p  => y <= (A / p) - T
  const y = Math.floor(classesAttended / p - totalClasses);
  const canMissClasses = Math.max(0, y);

  return {
    canMissClasses,
    needToAttendClasses: 0,
    currentPercentage,
    isAboveMinimum,
  };
};