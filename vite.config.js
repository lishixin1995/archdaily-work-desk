import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

function calendarOverflowPatch() {
  return {
    name: 'calendar-overflow-patch',
    enforce: 'pre',
    transform(code, id) {
      const normalizedId = id.replace(/\\/g, '/');

      if (normalizedId.endsWith('/src/main.jsx')) {
        const next = code
          .replace(
            "const weekTasks = sortFocusTasks(tasks.filter((task) => getTaskSegmentsForWeek(task, week))).slice(0, 4);",
            "const weekTasks = sortFocusTasks(tasks.filter((task) => getTaskSegmentsForWeek(task, week)));"
          )
          .replace(
            'const cellPaddingTop = 34 + taskRows * 20;',
            'const cellPaddingTop = 38 + taskRows * 22;'
          );

        return next === code ? null : { code: next, map: null };
      }

      if (normalizedId.endsWith('/src/styles.css')) {
        const next = code.replace(
          `.monthTaskOverlay {
  position: absolute;
  left: 0;
  right: 0;
  top: 30px;`,
          `.monthTaskOverlay {
  position: absolute;
  left: 0;
  right: 0;
  top: 38px;`
        );

        return next === code ? null : { code: next, map: null };
      }

      return null;
    },
  };
}

export default defineConfig({
  plugins: [calendarOverflowPatch(), react()],
});
