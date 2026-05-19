declare module 'electron-squirrel-startup' {
  const started: boolean;
  export default started;
}

declare module 'xlsx-js-style' {
  import XLSX = require('xlsx');
  export = XLSX;
}
