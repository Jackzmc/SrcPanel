<template>
  <div>
    <UContainer>
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="space-y-4 col-span-3">
          <h4 class="text-lg font-semibold">
            Select a key to set a keybind
          </h4>
          <div class="keyboardContainer hidden! sm:block!">
            <div class="simple-keyboard-main" />

            <div class="controlArrows">
              <div class="simple-keyboard-control" />
              <div class="simple-keyboard-arrows" />
            </div>

            <div class="numPad">
              <div class="simple-keyboard-numpad" />
              <div class="simple-keyboard-numpadEnd" />
            </div>
          </div>
          <div class="block sm:hidden">
            <p class="p-6">
              Sorry, keybind tool only available on larger displays
            </p>
          </div>
          <div class="my-4 p-2">
            <h4 class="text-lg">
              Keybinds
            </h4>
            <ul>
              <div v-for="(keybind, i) in keybinds" :key="keybind" class="list-disc list-inside grid grid-cols-1 sm:grid-cols-2 py-1">
                <div>
                  <code>{{ keybind }}</code>
                </div>
                <div class="list-item-controls">
                  <UButton color="error" @click="keybinds.splice(i, 1)">
                    <UIcon name="lucide:trash" />
                  </UButton>
                </div>
              </div>
            </ul>
          </div>
        </div>

        <div>
          <img src="/img/mousedef.jpg">
          <p class="py-3">
            You can also bind to certain mouse buttons. Use <code>MOUSE#</code> where # is the number in the above image.
          </p>
          <p class="py-3">
            For more information, view <a href="https://developer.valvesoftware.com/wiki/Bind">the bind comand on the wiki</a>
          </p>
        </div>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeMount, computed } from "vue";

definePageMeta({
  title: "Keybind Generator - Tools",
  pageTitle: "Keybinds",
  description: "List of all L4D2 keybind codes and tool to create keybinds",
  hero: "default",
});

const keyboard = ref();
const controlPad = ref();
const keyboardArrows = ref();
const numpad = ref();
const numpadEnd = ref();

const keybinds = ref<string[]>([]);
const command = ref<string | null>("sm_example_command");

onMounted(async () => {
  load();

  const { default: Keyboard } = await import("simple-keyboard");
  await import("simple-keyboard/build/css/index.css");
  const options = {
    onKeyPress,
    theme: "simple-keyboard hg-theme-default hg-layout-default",
    physicalKeyboardHighlight: true,
    syncInstanceInputs: true,
    mergeDisplay: true,
  };
  keyboard.value = new Keyboard(".simple-keyboard-main", {
    ...options,
    layout: {
      default: [
        "{escape} {f1} {f2} {f3} {f4} {f5} {f6} {f7} {f8} {f9} {f10} {f11} {f12}",
        "` 1 2 3 4 5 6 7 8 9 0 - = {backspace}",
        "{tab} q w e r t y u i o p [ ] \\",
        "{capslock} a s d f g h j k l ; ' {enter}",
        "{shiftleft} z x c v b n m , . / {shiftright}",
        "{controlleft} {metaleft} {altleft} {space} {altright} {fnkey} {controlright}",
      ],
      shift: [
        "{escape} {f1} {f2} {f3} {f4} {f5} {f6} {f7} {f8} {f9} {f10} {f11} {f12}",
        "~ ! @ # $ % ^ & * ( ) _ + {backspace}",
        "{tab} Q W E R T Y U I O P { } |",
        "{capslock} A S D F G H J K L : \" {enter}",
        "{shiftleft} Z X C V B N M < > ? {shiftright}",
        "{controlleft} {metaleft} {altleft} {space} {fnkey} {altright}",
      ],
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
    },
  });
  controlPad.value = new Keyboard(".simple-keyboard-control", {
    ...options,
    layout: {
      default: [
        "{prtscr} {scrolllock} {pause}",
        "{insert} {home} {pageup}",
        "{delete} {end} {pagedown}",
      ],
    },
  });
  keyboardArrows.value = new Keyboard(".simple-keyboard-arrows", {
    ...options,
    layout: {
      default: ["{arrowup}", "{arrowleft} {arrowdown} {arrowright}"],
    },
  });
  numpad.value = new Keyboard(".simple-keyboard-numpad", {
    ...options,
    layout: {
      default: [
        "{numlock} {numpaddivide} {numpadmultiply}",
        "{numpad7} {numpad8} {numpad9}",
        "{numpad4} {numpad5} {numpad6}",
        "{numpad1} {numpad2} {numpad3}",
        "{numpad0} {numpaddecimal}",
      ],
    },
  });
  numpadEnd.value = new Keyboard(".simple-keyboard-numpadEnd", {
    ...options,
    layout: {
      default: ["{numpadsubtract}", "{numpadadd}", "{numpadenter}"],
    },
  });
});

function onKeyPress(btnId: string) {
  const orgButton = btnId;
  let button = BUTTON_MAP[btnId];
  if (!button) {
    if (orgButton.startsWith("{")) {
      return; // TOOD: notify
    }
    button = orgButton;
  }
  if (button == "`") {
    if (!confirm("Warning: Using the ` backtick key will remove the default keybind to open the developer console.\n\nYou can restore the keybind if you launch the game with '-console' and enter 'bind ` toggleconsole'")) {
      return;
    }
  }
  const promptButtonText = button == orgButton ? button : `${orgButton} (${button})`;
  command.value = prompt(`Enter command for ${promptButtonText}`, command.value ?? "");
  if (command.value) {
    keybinds.value.splice(0, 0, `bind ${button} "${command.value}"`);
    save();
  }
}

function save() {
  window.localStorage.setItem("srcds_keybinds", JSON.stringify(keybinds.value));
}
function load() {
  const data = window.localStorage.getItem("srcds_keybinds");
  if (data) {
    keybinds.value = JSON.parse(data);
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
  "{numpaddecimal}": "kp_del",
  "{f1}": "f1",
  "{f2}": "f2",
  "{f3}": "f3",
  "{f4}": "f4",
  "{f5}": "f5",
  "{f6}": "f6",
  "{f7}": "f7",
  "{f8}": "f8",
  "{f9}": "f9",
  "{f10}": "f10",
  "{f11}": "f11",
  "{f12}": "f12",
  "{numlock}": "numlock",
};
</script>

<style>
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
/** Unsupported buttons: */
.hg-button-fnkey {
  display: none !important;
  opacity: 20%;
}
.hg-button-prtscr {
  opacity: 20%;
}
</style>
