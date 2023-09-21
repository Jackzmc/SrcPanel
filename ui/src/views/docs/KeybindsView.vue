<template>
<div class="container is-fluid">
  <div class="columns">
    <div class="column">
      <div class="keyboardContainer">
        <div class="simple-keyboard-main"></div>

        <div class="controlArrows">
          <div class="simple-keyboard-control"></div>
          <div class="simple-keyboard-arrows"></div>
        </div>

        <div class="numPad">
          <div class="simple-keyboard-numpad"></div>
          <div class="simple-keyboard-numpadEnd"></div>
        </div>
      </div>
    </div>
    <div class="column is-3">
      <img src="/img/mousedef.jpg" >
      <p>
        You can also bind to certain mouse buttons. Use <code>MOUSE#</code> where # is the number in the above image.
      </p>
      <p>For more information, view <a href="https://developer.valvesoftware.com/wiki/Bind">the bind comand on the wiki</a></p>
    </div>
  </div>
  <hr>
  <div class="">
    <div class="columns">
      <div class="column is-1">
        <span class="is-inline">Keybinds</span>
      </div>
      <div class="column is-3">
        <input :class="['input','is-inline','is-small','is-inline',{'is-danger': isInvalidCommand}]" style="width:100%" type="text"  v-model="command" />
        <p class="help is-danger" v-if="isInvalidCommand">
          Keybinds require the console command prefix <b>sm_</b>. Replace <b>/</b> or <b>!</b> with <b>sm_</b>
        </p>
      </div>
    </div>
    <div class="list has-hoverable-list-items">
        <div class="list-item" v-for="(keybind, i) in keybinds" :key="keybind">
          <div class="list-item-content" style="text-decoration: none">
            {{ keybind }}
          </div>
          <div class="list-item-controls">
            <div class="buttons is-right">
              <button class="button is-danger" @click="keybinds.splice(i, 1)">
                <Icon icon-class="is-small has-text-white" icon="trash" />
              </button>
            </div>
          </div>
        </div>
    </div>
  </div>
</div>
</template>

<script setup lang="ts">
import Keyboard from 'simple-keyboard';
import 'simple-keyboard/build/css/index.css';
import { ref, onMounted, onBeforeMount, computed } from 'vue';
import { notify } from '@kyvg/vue3-notification';

let keyboard = ref()
let controlPad = ref()
let keyboardArrows = ref()
let numpad = ref()
let numpadEnd = ref()

let keybinds = ref<any[]>([])
let command = ref("sm_example_command")

const isInvalidCommand = computed(() => {
  return command.value.startsWith('/') || command.value.startsWith('!')
})

onMounted(() => {
  const options = {
    onKeyPress,
    theme: "simple-keyboard hg-theme-default hg-layout-default",
    physicalKeyboardHighlight: true,
    syncInstanceInputs: true,
    mergeDisplay: true,
  }
  keyboard.value =  new Keyboard(".simple-keyboard-main", {
    ...options,
    layout: {
        default: [
          "{escape} {f1} {f2} {f3} {f4} {f5} {f6} {f7} {f8} {f9} {f10} {f11} {f12}",
          "` 1 2 3 4 5 6 7 8 9 0 - = {backspace}",
          "{tab} q w e r t y u i o p [ ] \\",
          "{capslock} a s d f g h j k l ; ' {enter}",
          "{shiftleft} z x c v b n m , . / {shiftright}",
          "{controlleft} {metaleft} {altleft} {space} {altright} {fnkey} {controlright}"
        ],
        shift: [
          "{escape} {f1} {f2} {f3} {f4} {f5} {f6} {f7} {f8} {f9} {f10} {f11} {f12}",
          "~ ! @ # $ % ^ & * ( ) _ + {backspace}",
          "{tab} Q W E R T Y U I O P { } |",
          '{capslock} A S D F G H J K L : " {enter}',
          "{shiftleft} Z X C V B N M < > ? {shiftright}",
          "{controlleft} {metaleft} {altleft} {space} {fnkey} {altright}"
        ]
      },
      display: {
        "{escape}": "esc ⎋",
        "{tab}": "tab ⇥",
        "{backspace}": "backspace ⌫",
        "{enter}": "enter ↵",
        "{capslock}": "caps lock ⇪",
        "{shiftleft}": "shift ⇧",
        "{shiftright}": "shift ⇧",
        "{controlleft}": "ctrl",
        "{controlright}": "ctrl",
        "{altleft}": "alt",
        "{altright}": "alt",
        "{fnkey}": "fn",
        "{metaleft}": "winkey",
      }
  });
  controlPad.value = new Keyboard(".simple-keyboard-control", {
      ...options,
      layout: {
        default: [
          "{prtscr} {scrolllock} {pause}",
          "{insert} {home} {pageup}",
          "{delete} {end} {pagedown}"
        ]
      }
    });
    keyboardArrows.value = new Keyboard(".simple-keyboard-arrows", {
      ...options,
      layout: {
        default: ["{arrowup}", "{arrowleft} {arrowdown} {arrowright}"]
      }
    });
    numpad.value = new Keyboard(".simple-keyboard-numpad", {
      ...options,
      layout: {
        default: [
          "{numlock} {numpaddivide} {numpadmultiply}",
          "{numpad7} {numpad8} {numpad9}",
          "{numpad4} {numpad5} {numpad6}",
          "{numpad1} {numpad2} {numpad3}",
          "{numpad0} {numpaddecimal}"
        ]
      }
    });
    numpadEnd.value = new Keyboard(".simple-keyboard-numpadEnd", {
      ...options,
      layout: {
        default: ["{numpadsubtract}", "{numpadadd}", "{numpadenter}"]
      }
    });
})

function onKeyPress(button: string) {
  const orgButton = button;
  button = BUTTON_MAP[button]
  if(!button) {
    if(orgButton.startsWith("{")) {
      return notify({
        type: "error",
        text: `Unsupported key ${orgButton}`
      })
    }
    button = orgButton
  }
  keybinds.value.splice(0, 0, `bind ${button} "${command.value}"`)
  save()
}

function save() {
  window.localStorage.setItem('panel_keybinds', JSON.stringify(keybinds.value))
}
function load() {
  const data = window.localStorage.getItem("panel_keybinds")
  if(data) {
    keybinds.value = JSON.parse(data)
  }
}

const BUTTON_MAP: Record<string, string> = {
  ";": "semicolon",
  "{tab}": "tab",
  "{capslock}": "capslock",
  "{shiftleft}": "shift",
  "{altleft}": "alt",
  "{controlleft}": "ctrl",
  "{shiftright}": "shift",
  "{altright}": "alt",
  "{controlright}": "ctrl",
  "{metaleft}": "lwin",
  "{metaright}": "rwin",
  "{space}": "space",
  "{backspace}": "backspace",
  "{pause}": "pause",
  "{scrolllock}": "scrolllock",
  "{enter}": "enter",
  "{escape}": "esc",
  "{numpad0}": "kp_ins",
  "{numpad1}": "kp_end",
  "{numpad2}": "kp_downarrow",
  "{numpad3}": "kp_pgdn",
  "{numpad4}": "kp_leftarrow",
  "{numpad5}": "kp_5",
  "{numpad6}": "kp_rightarrow",
  "{numpad7}": "kp_home",
  "{numpad8}": "kp_uparrow",
  "{numpad9}": "kp_pgup",
  "{numpadenter}": "kp_enter",
  "{numpadadd}": "kp_plus",
  "{numpadsubtract}": "kp_minus",
  "{numpadmultiply}": "kp_multiply",
  "{numpaddivide}": "kp_slash",
  "{insert}": "ins",
  "{home}": "home",
  "{pageup}": "pgup",
  "{delete}": "del",
  "{end}": "end",
  "{pagedown}": "pgdn",
  "{arrowup}": "uparrow",
  "{arrowleft}": "leftarrow",
  "{arrowright}": "rightarrow",
  "{arrowdown}": "downarrow",

}
onBeforeMount(() => {
  load()
})
</script>

<style scoped>
.keyboardContainer {
  display: flex;
  background-color: rgba(0, 0, 0, 0.1);
  justify-content: center;
  width: 1024px;
  margin: 0 auto;
  border-radius: 5px;
}

.simple-keyboard.hg-theme-default {
  display: inline-block;
}

.simple-keyboard-main.simple-keyboard {
  width: 640px;
  min-width: 640px;
  background-color: transparent;
}

.simple-keyboard-main.simple-keyboard .hg-row:first-child {
  margin-bottom: 10px;
}

.simple-keyboard-arrows.simple-keyboard {
  align-self: flex-end;
  background-color: transparent;
}

.simple-keyboard .hg-button.selectedButton {
  background-color: rgba(5, 25, 70, 0.53);
  color: white;
}

.simple-keyboard .hg-button.emptySpace {
  pointer-events: none;
  background-color: transparent;
  border: none;
  box-shadow: none;
}

.simple-keyboard-arrows .hg-row {
  justify-content: center;
}

.simple-keyboard-arrows .hg-button {
  width: 50px;
  flex-grow: 0;
  justify-content: center;
  display: flex;
  align-items: center;
}

.controlArrows {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-flow: column;
}

.simple-keyboard-control.simple-keyboard {
  background-color: transparent;
}

.simple-keyboard-control.simple-keyboard .hg-row:first-child {
  margin-bottom: 10px;
}

.simple-keyboard-control .hg-button {
  width: 50px;
  flex-grow: 0;
  justify-content: center;
  display: flex;
  align-items: center;
}

.numPad {
  display: flex;
  align-items: flex-end;
}

.simple-keyboard-numpad.simple-keyboard {
  background-color: transparent;
}

.simple-keyboard-numpad.simple-keyboard {
  width: 160px;
}

.simple-keyboard-numpad.simple-keyboard .hg-button {
  width: 50px;
  justify-content: center;
  display: flex;
  align-items: center;
}

.simple-keyboard-numpadEnd.simple-keyboard {
  width: 50px;
  background: transparent;
  margin: 0;
  padding: 5px 5px 5px 0;
}

.simple-keyboard-numpadEnd.simple-keyboard .hg-button {
  align-items: center;
  justify-content: center;
  display: flex;
}

.simple-keyboard-numpadEnd .hg-button.hg-standardBtn.hg-button-plus {
  height: 85px;
}

.simple-keyboard-numpadEnd.simple-keyboard .hg-button.hg-button-enter {
  height: 85px;
}

.simple-keyboard.hg-theme-default .hg-button.hg-selectedButton {
  background: rgba(5, 25, 70, 0.53);
  color: white;
}

.hg-button.hg-functionBtn.hg-button-space {
  width: 350px;
}

</style>
