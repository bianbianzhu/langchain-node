export function getTimeOfDay() {
  const date = new Date();

  return date.toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
