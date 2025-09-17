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

  // Calculate how many more classes needed to reach minimum percentage
  if (!isAboveMinimum) {
    const totalClassesNeeded = Math.ceil((minimumPercentage * totalClasses) / 100);
    const needToAttendClasses = totalClassesNeeded - classesAttended;
    return {
      canMissClasses: 0,
      needToAttendClasses,
      currentPercentage,
      isAboveMinimum
    };
  }

  // Calculate how many classes can be missed while maintaining minimum percentage
  const minimumClassesNeeded = Math.ceil((minimumPercentage * totalClasses) / 100);
  const canMissClasses = classesAttended - minimumClassesNeeded;

  return {
    canMissClasses,
    needToAttendClasses: 0,
    currentPercentage,
    isAboveMinimum
  };
};