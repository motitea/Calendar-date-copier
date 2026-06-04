document.addEventListener('DOMContentLoaded', function() {
  var prevMonthBtn = document.getElementById('prev-month');
  var nextMonthBtn = document.getElementById('next-month');
  var selectYear = document.getElementById('select-year');
  var selectMonth = document.getElementById('select-month');
  var calendarWeekdaysEl = document.getElementById('calendar-weekdays');
  var calendarDaysEl = document.getElementById('calendar-days');
  var langRadios = document.querySelectorAll('input[name="lang"]');
  var selectedDatesListEl = document.getElementById('selected-dates-list');
  var defaultStartTimeInput = document.getElementById('default-start-time');
  var defaultEndTimeInput = document.getElementById('default-end-time');
  var formatRadios = document.querySelectorAll('input[name="format"]');
  var prefixTextEl = document.getElementById('prefix-text');
  var suffixTextEl = document.getElementById('suffix-text');
  var outputTextEl = document.getElementById('output-text');
  var copyBtn = document.getElementById('copy-btn');
  var clearAllBtn = document.getElementById('clear-all-btn');
  var templateSelect = document.getElementById('template-select');
  var deleteTemplateBtn = document.getElementById('delete-template-btn');
  var newTemplateNameInput = document.getElementById('new-template-name');
  var saveTemplateBtn = document.getElementById('save-template-btn');
  var restorePresetsBtn = document.getElementById('restore-presets-btn');
  
  var dateFormatPresetSelect = document.getElementById('date-format-preset');
  var customFormatBuilderEl = document.getElementById('custom-format-builder');
  var fmtM = document.getElementById('fmt-m');
  var fmtD = document.getElementById('fmt-d');
  var fmtW = document.getElementById('fmt-w');
  var fmtSp = document.getElementById('fmt-sp');
  var fmtSh = document.getElementById('fmt-sh');
  var fmtSm = document.getElementById('fmt-sm');
  var fmtEh = document.getElementById('fmt-eh');
  var fmtEm = document.getElementById('fmt-em');
  var formatPartsElements = [fmtM, fmtD, fmtW, fmtSp, fmtSh, fmtSm, fmtEh, fmtEm];

  var currentDate = new Date();
  currentDate.setDate(1);
  var selectedDates = [];
  var templates = [];
  var currentLang = 'ja';
  var saveTimer = null;

  var i18n = {
    ja: {
      weekdays: ['日', '月', '火', '水', '木', '金', '土'],
      months: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
      noDates: '日程が選択されていません',
      copied: 'COPIED!',
      confirmRestore: '初期テンプレートを復元しますか？',
      restored: '復元しました',
      confirmDelete: '削除しますか？',
      deleted: '削除しました',
      enterName: '名前を入力してください',
      saved: '保存しました',
      overwrite: '上書きしますか？',
      clearAll: 'すべて削除しますか？'
    },
    en: {
      weekdays: ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'],
      months: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
      noDates: 'NO DATES SELECTED',
      copied: 'COPIED!',
      confirmRestore: 'Restore defaults?',
      restored: 'Restored.',
      confirmDelete: 'Delete?',
      deleted: 'Deleted.',
      enterName: 'Enter a name.',
      saved: 'Saved.',
      overwrite: 'Overwrite?',
      clearAll: 'Clear all?'
    }
  };

  var formatPresets = {
    preset1: { m: '/', d: '(', w: ')', sp: ' ', sh: ':', sm: '-', eh: ':', em: '' },
    preset2: { m: '月', d: '日(', w: ')', sp: ' ', sh: '時', sm: '分〜', eh: '時', em: '分' }
  };

  var presetTemplates = [
    { name: "Business", start: "10:00", end: "18:00", prefix: "日程の候補です。", suffix: "よろしくお願いします。", dateFormatPreset: "preset1" }
  ];

  init();

  function init() {
    chrome.storage.local.get(
      ['defaultStartTime', 'defaultEndTime', 'format', 'prefix', 'suffix', 'templates', 'lastTemplateName', 'lang', 'dateFormatPreset', 'customFormatParts'],
      function(r) {
        if (r.defaultStartTime) defaultStartTimeInput.value = r.defaultStartTime;
        if (r.defaultEndTime) defaultEndTimeInput.value = r.defaultEndTime;
        
        if (r.dateFormatPreset) dateFormatPresetSelect.value = r.dateFormatPreset;
        else dateFormatPresetSelect.value = 'preset1';
        
        if (r.customFormatParts) {
          fmtM.value = r.customFormatParts.m;
          fmtD.value = r.customFormatParts.d;
          fmtW.value = r.customFormatParts.w;
          fmtSp.value = r.customFormatParts.sp;
          fmtSh.value = r.customFormatParts.sh;
          fmtSm.value = r.customFormatParts.sm;
          fmtEh.value = r.customFormatParts.eh;
          fmtEm.value = r.customFormatParts.em;
        }
        
        toggleFormatBuilder();
        
        if (r.format) {
          var radio = document.querySelector('input[name="format"][value="' + r.format + '"]');
          if (radio) radio.checked = true;
        }
        if (r.lang) {
          currentLang = r.lang;
          var lr = document.querySelector('input[name="lang"][value="' + currentLang + '"]');
          if (lr) lr.checked = true;
        }
        if (r.prefix !== undefined) prefixTextEl.value = r.prefix;
        if (r.suffix !== undefined) suffixTextEl.value = r.suffix;
        if (r.templates) {
          templates = r.templates;
        } else {
          templates = JSON.parse(JSON.stringify(presetTemplates));
          chrome.storage.local.set({ templates: templates });
        }
        renderTemplateList();
        if (r.lastTemplateName) templateSelect.value = r.lastTemplateName;
        renderCalendar();
        updateOutput();
      }
    );
    bindEvents();
  }

  function toggleFormatBuilder() {
    customFormatBuilderEl.style.display = dateFormatPresetSelect.value === 'custom' ? 'flex' : 'none';
  }

  function bindEvents() {
    prevMonthBtn.addEventListener('click', function() { currentDate.setMonth(currentDate.getMonth() - 1); renderCalendar(); });
    nextMonthBtn.addEventListener('click', function() { currentDate.setMonth(currentDate.getMonth() + 1); renderCalendar(); });

    defaultStartTimeInput.addEventListener('change', function(e) {
      if (defaultEndTimeInput.value <= e.target.value) {
        defaultEndTimeInput.value = addOneHour(e.target.value);
      }
      chrome.storage.local.set({ defaultStartTime: e.target.value, defaultEndTime: defaultEndTimeInput.value });
      updateOutput();
    });
    defaultEndTimeInput.addEventListener('change', function(e) {
      if (e.target.value <= defaultStartTimeInput.value) {
        defaultStartTimeInput.value = subOneHour(e.target.value);
      }
      chrome.storage.local.set({ defaultEndTime: e.target.value, defaultStartTime: defaultStartTimeInput.value });
      updateOutput();
    });

    copyBtn.addEventListener('click', function() {
      if (!outputTextEl.value) return;
      navigator.clipboard.writeText(outputTextEl.value).then(function() {
        var orig = copyBtn.innerText;
        copyBtn.innerText = i18n[currentLang].copied;
        copyBtn.style.backgroundColor = '#4CAF50';
        setTimeout(function() { copyBtn.innerText = orig; copyBtn.style.backgroundColor = ''; }, 1500);
      }).catch(function() {
        // Fallback: select textarea content
        outputTextEl.select();
        document.execCommand('copy');
      });
    });

    selectYear.addEventListener('change', updateDateFromSelectors);
    selectMonth.addEventListener('change', updateDateFromSelectors);

    langRadios.forEach(function(r) {
      r.addEventListener('change', function(e) {
        currentLang = e.target.value;
        chrome.storage.local.set({ lang: currentLang });
        updateMonthOptions();
        renderCalendar();
        renderSelectedDates();
        updateOutput();
      });
    });

    formatRadios.forEach(function(r) {
      r.addEventListener('change', function(e) {
        chrome.storage.local.set({ format: e.target.value });
        updateOutput();
      });
    });

    dateFormatPresetSelect.addEventListener('change', function() {
      toggleFormatBuilder();
      updateOutput();
      debounceSaveText();
    });

    formatPartsElements.forEach(function(el) {
      var eventName = el.tagName === 'SELECT' ? 'change' : 'input';
      el.addEventListener(eventName, function() {
        if (dateFormatPresetSelect.value === 'custom') {
          updateOutput();
          debounceSaveText();
        }
      });
    });

    prefixTextEl.addEventListener('input', function() { updateOutput(); debounceSaveText(); });
    suffixTextEl.addEventListener('input', function() { updateOutput(); debounceSaveText(); });

    saveTemplateBtn.addEventListener('click', saveCurrentAsTemplate);
    templateSelect.addEventListener('change', function(e) { applyTemplate(e.target.value); });
    deleteTemplateBtn.addEventListener('click', deleteCurrentTemplate);
    restorePresetsBtn.addEventListener('click', restorePresets);

    clearAllBtn.addEventListener('click', function() {
      if (selectedDates.length === 0) return;
      if (!confirm(i18n[currentLang].clearAll)) return;
      selectedDates = [];
      renderCalendar();
      renderSelectedDates();
      updateOutput();
    });
  }

  function debounceSaveText() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function() {
      chrome.storage.local.set({ 
        prefix: prefixTextEl.value, 
        suffix: suffixTextEl.value,
        dateFormatPreset: dateFormatPresetSelect.value,
        customFormatParts: {
          m: fmtM.value, d: fmtD.value, w: fmtW.value, sp: fmtSp.value,
          sh: fmtSh.value, sm: fmtSm.value, eh: fmtEh.value, em: fmtEm.value
        }
      });
    }, 500);
  }

  function renderCalendar() {
    var year = currentDate.getFullYear();
    var month = currentDate.getMonth();
    calendarDaysEl.innerHTML = '';
    calendarWeekdaysEl.innerHTML = '';

    i18n[currentLang].weekdays.forEach(function(day) {
      var d = document.createElement('div');
      d.className = 'weekday';
      d.textContent = day;
      calendarWeekdaysEl.appendChild(d);
    });

    updateYearOptions(year);
    updateMonthOptions();
    selectYear.value = year;
    selectMonth.value = month;

    var firstDay = new Date(year, month, 1).getDay();
    var daysInMonth = new Date(year, month + 1, 0).getDate();

    for (var i = 0; i < firstDay; i++) {
      var e = document.createElement('div');
      e.className = 'day empty';
      calendarDaysEl.appendChild(e);
    }
    for (var j = 1; j <= daysInMonth; j++) {
      var d = document.createElement('div');
      d.className = 'day';
      d.textContent = j;
      var dObj = new Date(year, month, j);
      if (selectedDates.some(function(s) { return s.dateId === formatDateId(dObj); })) {
        d.classList.add('selected');
      }
      d.addEventListener('click', (function(obj) {
        return function() { addDateSlot(obj); };
      })(dObj));
      calendarDaysEl.appendChild(d);
    }
  }

  function addDateSlot(dateObj) {
    selectedDates.push({
      slotId: Date.now() + Math.random(),
      dateId: formatDateId(dateObj),
      dateObj: new Date(dateObj),
      start: defaultStartTimeInput.value || '17:00',
      end: defaultEndTimeInput.value || '19:00'
    });
    selectedDates.sort(function(a, b) { return a.dateObj - b.dateObj; });
    renderCalendar();
    renderSelectedDates();
    updateOutput();
  }

  function renderSelectedDates() {
    selectedDatesListEl.innerHTML = '';
    if (selectedDates.length === 0) {
      var empty = document.createElement('li');
      empty.className = 'empty-message';
      empty.textContent = i18n[currentLang].noDates;
      selectedDatesListEl.appendChild(empty);
      return;
    }
    selectedDates.forEach(function(item, index) {
      var li = document.createElement('li');
      li.className = 'selected-date-item';

      var lbl = document.createElement('div');
      lbl.className = 'selected-date-label';
      lbl.textContent = formatDateDisplay(item.dateObj);

      var tDiv = document.createElement('div');
      tDiv.className = 'selected-date-times';

      var sInp = document.createElement('input');
      sInp.type = 'time';
      sInp.value = item.start;

      var sep = document.createTextNode(' - ');

      var eInp = document.createElement('input');
      eInp.type = 'time';
      eInp.value = item.end;

      sInp.addEventListener('change', function(e) {
        item.start = e.target.value;
        if (eInp.value <= e.target.value) {
          eInp.value = addOneHour(e.target.value);
          item.end = eInp.value;
        }
        updateOutput();
      });
      eInp.addEventListener('change', function(e) {
        item.end = e.target.value;
        if (e.target.value <= sInp.value) {
          sInp.value = subOneHour(e.target.value);
          item.start = sInp.value;
        }
        updateOutput();
      });

      tDiv.appendChild(sInp);
      tDiv.appendChild(sep);
      tDiv.appendChild(eInp);

      var del = document.createElement('button');
      del.className = 'delete-slot-btn';
      del.type = 'button';
      del.textContent = 'X';
      del.addEventListener('click', (function(idx) {
        return function() {
          selectedDates.splice(idx, 1);
          renderCalendar();
          renderSelectedDates();
          updateOutput();
        };
      })(index));

      li.appendChild(lbl);
      li.appendChild(tDiv);
      li.appendChild(del);
      selectedDatesListEl.appendChild(li);
    });
  }

  function updateOutput() {
    var format = document.querySelector('input[name="format"]:checked').value;
    
    var presetVal = dateFormatPresetSelect.value;
    var fps = presetVal === 'custom' ? {
      m: fmtM.value, d: fmtD.value, w: fmtW.value, sp: fmtSp.value,
      sh: fmtSh.value, sm: fmtSm.value, eh: fmtEh.value, em: fmtEm.value
    } : formatPresets[presetVal] || formatPresets.preset1;

    var lines = selectedDates.map(function(item) {
      var m = item.dateObj.getMonth() + 1;
      var d = item.dateObj.getDate();
      var w = i18n[currentLang].weekdays[item.dateObj.getDay()];
      var st = item.start;
      var et = item.end;
      var sh = st.split(':')[0];
      var sm = st.split(':')[1];
      var eh = et.split(':')[0];
      var em = et.split(':')[1];

      return m + fps.m + d + fps.d + w + fps.w + fps.sp +
             sh + fps.sh + sm + fps.sm + eh + fps.eh + em + fps.em;
    });
    var datesText = format === 'vertical' ? lines.join('\n') : lines.join(', ');
    var parts = [];
    if (prefixTextEl.value) parts.push(prefixTextEl.value);
    if (datesText) parts.push(datesText);
    if (suffixTextEl.value) parts.push(suffixTextEl.value);
    outputTextEl.value = parts.join('\n');
  }

  function formatDateId(d) {
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  function formatDateDisplay(d) {
    return (d.getMonth() + 1) + '/' + d.getDate() + '(' + i18n[currentLang].weekdays[d.getDay()] + ')';
  }

  function renderTemplateList() {
    while (templateSelect.options.length > 1) templateSelect.remove(1);
    templates.forEach(function(t) {
      var o = document.createElement('option');
      o.value = t.name;
      o.textContent = t.name;
      templateSelect.appendChild(o);
    });
  }

  function saveCurrentAsTemplate() {
    var name = newTemplateNameInput.value.trim();
    if (!name) { alert(i18n[currentLang].enterName); return; }
    var tpl = {
      name: name,
      start: defaultStartTimeInput.value,
      end: defaultEndTimeInput.value,
      prefix: prefixTextEl.value,
      suffix: suffixTextEl.value,
      dateFormatPreset: dateFormatPresetSelect.value,
      customFormatParts: {
        m: fmtM.value, d: fmtD.value, w: fmtW.value, sp: fmtSp.value,
        sh: fmtSh.value, sm: fmtSm.value, eh: fmtEh.value, em: fmtEm.value
      }
    };
    var idx = templates.findIndex(function(t) { return t.name === name; });
    if (idx > -1) {
      if (!confirm(i18n[currentLang].overwrite)) return;
      templates[idx] = tpl;
    } else {
      templates.push(tpl);
    }
    chrome.storage.local.set({ templates: templates }, function() {
      renderTemplateList();
      templateSelect.value = name;
      chrome.storage.local.set({ lastTemplateName: name });
      newTemplateNameInput.value = '';
      alert(i18n[currentLang].saved);
    });
  }

  function applyTemplate(name) {
    if (!name) return;
    var t = templates.find(function(t) { return t.name === name; });
    if (!t) return;
    defaultStartTimeInput.value = t.start;
    defaultEndTimeInput.value = t.end;
    prefixTextEl.value = t.prefix || '';
    suffixTextEl.value = t.suffix || '';
    dateFormatPresetSelect.value = t.dateFormatPreset || 'preset1';
    if (t.customFormatParts) {
      fmtM.value = t.customFormatParts.m;
      fmtD.value = t.customFormatParts.d;
      fmtW.value = t.customFormatParts.w;
      fmtSp.value = t.customFormatParts.sp;
      fmtSh.value = t.customFormatParts.sh;
      fmtSm.value = t.customFormatParts.sm;
      fmtEh.value = t.customFormatParts.eh;
      fmtEm.value = t.customFormatParts.em;
    }
    toggleFormatBuilder();

    chrome.storage.local.set({
      defaultStartTime: t.start, defaultEndTime: t.end,
      prefix: t.prefix, suffix: t.suffix, 
      dateFormatPreset: dateFormatPresetSelect.value,
      customFormatParts: t.customFormatParts,
      lastTemplateName: name
    });
    updateOutput();
  }

  function deleteCurrentTemplate() {
    var name = templateSelect.value;
    if (!name) return;
    if (!confirm(i18n[currentLang].confirmDelete)) return;
    templates = templates.filter(function(t) { return t.name !== name; });
    chrome.storage.local.set({ templates: templates }, function() {
      renderTemplateList();
      templateSelect.value = '';
      chrome.storage.local.set({ lastTemplateName: '' });
      alert(i18n[currentLang].deleted);
    });
  }

  function restorePresets() {
    if (!confirm(i18n[currentLang].confirmRestore)) return;
    presetTemplates.forEach(function(p) {
      var idx = templates.findIndex(function(t) { return t.name === p.name; });
      if (idx > -1) templates[idx] = JSON.parse(JSON.stringify(p));
      else templates.push(JSON.parse(JSON.stringify(p)));
    });
    chrome.storage.local.set({ templates: templates }, function() {
      renderTemplateList();
      alert(i18n[currentLang].restored);
    });
  }

  function updateYearOptions(currY) {
    if (selectYear.options.length > 0) return;
    for (var y = currY - 5; y <= currY + 10; y++) {
      var o = document.createElement('option');
      o.value = y;
      o.textContent = y;
      selectYear.appendChild(o);
    }
  }

  function updateDateFromSelectors() {
    currentDate.setFullYear(parseInt(selectYear.value, 10));
    currentDate.setMonth(parseInt(selectMonth.value, 10));
    renderCalendar();
  }

  function updateMonthOptions() {
    var currV = selectMonth.value;
    selectMonth.innerHTML = '';
    i18n[currentLang].months.forEach(function(n, i) {
      var o = document.createElement('option');
      o.value = i;
      o.textContent = n;
      selectMonth.appendChild(o);
    });
    if (currV !== '') selectMonth.value = currV;
  }

  function addOneHour(timeStr) {
    var parts = timeStr.split(':');
    var h = parseInt(parts[0], 10) + 1;
    var m = parts[1];
    if (h >= 24) h = 23;
    return (h < 10 ? '0' + h : '' + h) + ':' + m;
  }

  function subOneHour(timeStr) {
    var parts = timeStr.split(':');
    var h = parseInt(parts[0], 10) - 1;
    var m = parts[1];
    if (h < 0) h = 0;
    return (h < 10 ? '0' + h : '' + h) + ':' + m;
  }
});
