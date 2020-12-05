/* eslint-disable no-param-reassign */
/* eslint-disable import/extensions */

import * as storage from './storage.js';
import create from './create.js';
import language from './index.js'; // { en, ru }
import Key from './key.js';
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const main = create('main', '',
  [create('h1', 'title', 'Virtual Keyboard'),
  create('p', 'hint', 'Use button "Sound" to enable keyboard sounds. To change language use button en or ru.')]);

export default class Keyboard {
  constructor(rowsOrder) {
    this.rowsOrder = rowsOrder;
    this.keysPressed = {};
    this.isCaps = false;
    this.soundOn = false;
    this.isRu =  true;
    this.soundKey = false;
    this.recognition = new SpeechRecognition();
    this.recognition.interimResults = true;
    this.isVoice = true;
  }

  init(langCode) {
    this.keyBase = language[langCode];
    this.output = create('textarea', 'output', null, main,
      ['placeholder', 'Start type something...'],
      ['rows', 5],
      ['cols', 50],
      ['spellcheck', false],
      ['autocorrect', 'off']);
    this.container = create('div', 'keyboard hidden', null, main, ['language', langCode]);
    
    if (langCode === 'ru') {
      this.isRu = true;
    } else if (langCode === 'en') {
      this.isRu = false;
    }
    document.body.prepend(main);
    return this;
  }

  generateLayout() {
    this.keyButtons = [];
    this.rowsOrder.forEach((row, i) => {
      const rowElement = create('div', 'keyboard__row', null, this.container, ['row', i + 1]);
      rowElement.style.gridTemplateColumns = `repeat(${row.length}, 1fr)`;
      row.forEach((code) => {
        const keyObj = this.keyBase.find((key) => key.code === code);
        if (keyObj) {
          const keyButton = new Key(keyObj);
          this.keyButtons.push(keyButton);
          rowElement.appendChild(keyButton.div);
        }
      });
    });

    let textOutput = document.querySelector('.output');
    textOutput.addEventListener('click', () => {
      this.container.classList.remove('hidden');
    })
    document.addEventListener('keydown', this.handleEvent);
    document.addEventListener('keyup', this.handleEvent);
    this.container.onmousedown = this.preHandleEvent;
    this.container.onmouseup = this.preHandleEvent;
  }

  preHandleEvent = (e) => {
    e.stopPropagation();
    const keyDiv = e.target.closest('.keyboard__key');
    if (!keyDiv) return;
    const { dataset: { code } } = keyDiv;
    keyDiv.addEventListener('mouseleave', this.resetButtonState);
    this.handleEvent({ code, type: e.type });
  };

  // Ф-я обработки событий

  handleEvent = (e) => {
    if (e.stopPropagation) e.stopPropagation();
    const { code, type } = e;
    const keyObj = this.keyButtons.find((key) => key.code === code);
    if (!keyObj) return;
    this.output.focus();

    // НАЖАТИЕ КНОПКИ
    if (type.match(/keydown|mousedown/)) {
      if (!type.match(/mouse/)) e.preventDefault();

      keyObj.div.classList.add('active');

      if (code.match(/Hide/)) {
        this.container.classList.add('hidden');
      } else {
        this.container.classList.remove('hidden');
      }
      if (code.match(/Shift|Enter|Caps|Backspace/)) {
        this.fnSound(this.soundOn);
      } else {
        this.sound(this.soundOn, this.isRu);
      }

      if (code.match(/Control|Alt|Caps|LangKey/) && e.repeat) return;

      if (code.match(/Control/)) this.ctrKey = true;
      if (code.match(/Alt/)) this.altKey = true;
      if (code.match(/LangKey/)) this.switchLanguage();
      

      if (code.match(/Caps/) && !this.isCaps) {
        this.isCaps = true;
        this.switchUpperCase(true);
      } else if (code.match(/Caps/) && this.isCaps) {
        this.isCaps = false;
        this.switchUpperCase(false);
        keyObj.div.classList.remove('active');
      }

      // Определяем, какой символ мы пишем в консоль (спец или основной)
      if (!this.isCaps) {
        // если не зажат капс, смотрим не зажат ли шифт
        this.printToOutput(keyObj, this.shiftKey ? keyObj.shift : keyObj.small);
        this.switchUpperCase(false);
      } else if (this.isCaps) {
        // если зажат капс
        if (this.shiftKey) {
          // и при этом зажат шифт - то для кнопки со спецсимволом даем верхний регистр
          this.printToOutput(keyObj, keyObj.sub.innerHTML ? keyObj.shift : keyObj.small);
        } else {
          // и при этом НЕ зажат шифт - то для кнопки без спецсивмола даем верхний регистр
          this.printToOutput(keyObj, !keyObj.sub.innerHTML ? keyObj.shift : keyObj.small);
        }
      }
      this.keysPressed[keyObj.code] = keyObj;
      
    // ОТЖАТИЕ КНОПКИ
    } else if (e.type.match(/keyup|mouseup/)) {
      this.resetPressedButtons(code);
      if (code.match(/Shift/) && this.shiftKey) {
        this.shiftKey = false;
        keyObj.div.classList.remove('active');
        this.switchUpperCase(false);
      } else if (code.match(/Shift/)) {
        this.shiftKey = true;
        this.switchUpperCase(true);
        keyObj.div.classList.add('active');
      }

      if (code.match(/Control/)) this.ctrKey = false;
      if (code.match(/Alt/)) this.altKey = false;

      if (!(code.match(/Caps|Shift/))) {
        keyObj.div.classList.remove('active');
      }

      if (code.match(/Sound/) && this.soundKey) {
        this.soundKey = false;
        this.soundOn = false;
        keyObj.div.classList.remove('active');
      } else if (code.match(/Sound/) && !this.soundKey) {
        this.soundKey = true;
        this.soundOn = true;
        keyObj.div.classList.add('active');
      }

      if (code.match(/Microphone/)) {
        this.voiceHandle(e);
        if (!this.isVoice) {
          keyObj.div.classList.add('active');
        } else {
          keyObj.div.classList.remove('active');
        }
      } 
    }
  }

  resetButtonState = ({ target: { dataset: { code } } }) => {
    if (code.match('Shift')) {
      this.shiftKey = false;
      this.switchUpperCase(false);
      this.keysPressed[code].div.classList.remove('active');
    }
    if (code.match(/Control/)) this.ctrKey = false;
    if (code.match(/Alt/)) this.altKey = false;
    this.resetPressedButtons(code);
    this.output.focus();
  }

  resetPressedButtons = (targetCode) => {
    if (!this.keysPressed[targetCode]) return;
    if (!targetCode.match(/Caps|Shift/)) this.keysPressed[targetCode].div.classList.remove('active');
    this.keysPressed[targetCode].div.removeEventListener('mouseleave', this.resetButtonState);
    delete this.keysPressed[targetCode];
  }

  switchUpperCase(isTrue) {
    // Флаг - чтобы понимать, мы поднимаем регистр или опускаем
    if (isTrue) {
      // Мы записывали наши кнопки в keyButtons, теперь можем легко итерироваться по ним
      this.keyButtons.forEach((button) => {
        // Если у кнопки есть спецсивол - мы должны переопределить стили
        if (button.sub) {
          // Если только это не капс, тогда поднимаем у спецсимволов
          if (this.shiftKey) {
            button.sub.classList.add('sub-active');
            button.letter.classList.add('sub-inactive');
          } else if (!this.shiftKey) {
            button.sub.classList.remove('sub-active');
            button.letter.classList.remove('sub-inactive');
          }
        }
        // Не трогаем функциональные кнопки
        // И если капс, и не шифт, и именно наша кнопка без спецсимвола
        if (!button.isFnKey && this.isCaps && !this.shiftKey && !button.sub.innerHTML) {
          // тогда поднимаем регистр основного символа letter
          button.letter.innerHTML = button.shift;
        // Если капс и зажат шифт
        } else if (!button.isFnKey && this.isCaps && this.shiftKey) {
          // тогда опускаем регистр для основного симовла letter
          button.letter.innerHTML = button.small;
        // а если это просто шифт - тогда поднимаем регистр у основного символа
        // только у кнопок, без спецсимвола --- там уже выше отработал код для них
        } else if (!button.isFnKey && !button.sub.innerHTML) {
          button.letter.innerHTML = button.shift;
        }
      });
    } else {
      // опускаем регистр в обратном порядке
      this.keyButtons.forEach((button) => {
        // Не трогаем функциональные кнопки
        // Если есть спецсимвол
        if (button.sub.innerHTML && !button.isFnKey) {
          // то возвращаем в исходное
          button.sub.classList.remove('sub-active');
          button.letter.classList.remove('sub-inactive');
          // если не зажат капс
          if (!this.isCaps) {
            // то просто возвращаем основным символам нижний регистр
            button.letter.innerHTML = button.small;
            
          } else if (!this.isCaps) {
            // если капс зажат - то возвращаем верхний регистр
            button.letter.innerHTML = button.shift;
          }
        // если это кнопка без спецсимвола (снова не трогаем функциональные)
        } else if (!button.isFnKey) {
          // то если зажат капс
          if (this.isCaps) {
            // возвращаем верхний регистр
            button.letter.innerHTML = button.shift;
           
          } else {
            // если отжат капс - возвращаем нижний регистр
            button.letter.innerHTML = button.small;
          }
        }
      });
    }
  }

  switchLanguage = () => {
    const langAbbr = Object.keys(language);
    let langIdx = langAbbr.indexOf(this.container.dataset.language);
    this.keyBase = langIdx + 1 < langAbbr.length ? language[langAbbr[langIdx += 1]]
      : language[langAbbr[langIdx -= langIdx]];

    this.container.dataset.language = langAbbr[langIdx];
    storage.set('kbLang', langAbbr[langIdx]);

    if (langAbbr[langIdx] === 'ru') {
      this.isRu = true;
    } else if (langAbbr[langIdx] === 'en') {
      this.isRu = false;
    }

    this.keyButtons.forEach((button) => {
      const keyObj = this.keyBase.find((key) => key.code === button.code);
      if (!keyObj) return;
      button.shift = keyObj.shift;
      button.small = keyObj.small;
      if (keyObj.shift && keyObj.shift.match(/[^a-zA-Zа-яА-ЯёЁ0-9]/g)) {
        button.sub.innerHTML = keyObj.shift;
      } else {
        button.sub.innerHTML = '';
      }
      button.letter.innerHTML = keyObj.small;
    });
    if (this.isCaps) this.switchUpperCase(true);
  }

  printToOutput(keyObj, symbol) {
    let cursorPos = this.output.selectionStart;
    const left = this.output.value.slice(0, cursorPos);
    const right = this.output.value.slice(cursorPos);
    const textHandlers = {
      Tab: () => {
        this.output.value = `${left}\t${right}`;
        cursorPos += 1;
      },
      ArrowLeft: () => {
        cursorPos = cursorPos - 1 >= 0 ? cursorPos - 1 : 0;
      },
      ArrowRight: () => {
        cursorPos += 1;
      },
      ArrowUp: () => {
        const positionFromLeft = this.output.value.slice(0, cursorPos).match(/(\n).*$(?!\1)/g) || [[1]];
        cursorPos -= positionFromLeft[0].length;
      },
      ArrowDown: () => {
        const positionFromLeft = this.output.value.slice(cursorPos).match(/^.*(\n).*(?!\1)/) || [[1]];
        cursorPos += positionFromLeft[0].length;
      },
      Enter: () => {
        this.output.value = `${left}\n${right}`;
        cursorPos += 1;
      },
      Delete: () => {
        this.output.value = `${left}${right.slice(1)}`;
      },
      Backspace: () => {
        this.output.value = `${left.slice(0, -1)}${right}`;
        cursorPos -= 1;
      },
      Space: () => {
        this.output.value = `${left} ${right}`;
        cursorPos += 1;
      },
    };
    if (textHandlers[keyObj.code]) {
      textHandlers[keyObj.code]();
      this.shiftKey = false;
    }
    else if (!keyObj.isFnKey) {
      cursorPos += 1;
      this.output.value = `${left}${symbol || ''}${right}`;
      this.shiftKey = false;
      let shiftBtn = document.querySelector('div[data-code="ShiftLeft"]');
      shiftBtn.classList.remove('active');
      if (this.isCaps) {
        this.switchUpperCase(true);
      }
    }
    this.output.setSelectionRange(cursorPos, cursorPos);
  }

  sound(soundOn, isRu) {
    let soundEn = new Audio('./assets/keyboard-button-en.mp3');
    let soundRu = new Audio('./assets/keyboard-button-ru.mp3');
    if(soundOn && isRu) {
      soundRu.play();
    } else if (soundOn && !isRu) {
      soundEn.play();
    }
  }

  fnSound(soundOn) {
    let soundFn = new Audio('./assets/keyboard-button-fn.mp3');
    if(soundOn) {
      soundFn.play();
    } 
  }

  voiceHandle = (e) => {
    this.recognition.lang = this.isRu ? 'ru-RU' : 'en-Us';
    this.recognition.addEventListener('result', e => {
      const transcript = Array.from(e.results)
          .map(result => result[0])
          .map(result => result.transcript)
          .join('');

      const poopScript = transcript;

      if (e.results[0].isFinal) {
        if(this.output.value) {
          this.output.value += ' ' + poopScript;
        } else {
          this.output.value = poopScript;
        }
      }
    });

    if (this.isVoice) {
      this.recognition.start();
      this.recognition.addEventListener('end', this.recognition.start);
      this.isVoice = false;
    } else {
      this.recognition.removeEventListener('end', this.recognition.start);
      this.recognition.stop();
      this.recognition = new SpeechRecognition();
      this.recognition.lang = this.isRu ? 'ru-RU' : 'en-Us';
      this.recognition.interimResults = true;
      this.isVoice = true;
    }
  }
}
