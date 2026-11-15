// Which installer the download buttons hand out, from latest.json: the Mac dmg (platforms.darwin) on a Mac, otherwise
// the Windows installer. Used by download/ and app/, and tested in tests/setup-app.test.js.
(function (root) {
  /** True on a Mac. An iPad asking for the desktop site also says "Macintosh", but it has a touch screen. */
  function isMac(nav) {
    if (!nav) return false;
    var platform = (nav.userAgentData && nav.userAgentData.platform) || nav.platform || '';
    var mac = /mac/i.test(platform) || /Macintosh/.test(nav.userAgent || '');
    return mac && !(nav.maxTouchPoints > 1);
  }

  /** 'mac' or 'windows': ?os=mac or ?os=windows in the address wins, then what the browser says. */
  function systemFor(search, nav) {
    var m = /[?&]os=(mac|windows)\b/.exec(search || '');
    if (m) return m[1];
    return isMac(nav) ? 'mac' : 'windows';
  }

  /** The file to download for a system, or null when latest.json has none for it. */
  function pickDownload(j, system) {
    if (!j || typeof j !== 'object') return null;
    var p = j.platforms && typeof j.platforms === 'object' ? j.platforms : {};
    if (system === 'mac') {
      var d = p.darwin;
      return d && d.dmg ? { system: 'mac', url: d.dmg, version: d.version } : null;
    }
    var w = p.win32 && p.win32.url ? p.win32 : j;
    return w.url ? { system: 'windows', url: w.url, version: w.version || j.version } : null;
  }

  root.CanvasDownload = { isMac: isMac, systemFor: systemFor, pickDownload: pickDownload };
})(this);
