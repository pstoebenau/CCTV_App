<div bind:this={backdrop} class="backdrop">
  <div bind:this={container} class="container">
    
  </div>
</div>

<script lang="ts">
import { onMount } from 'svelte';

  import type Form from '../models/Form';

  let backdrop: HTMLDivElement;
  let container: HTMLDivElement;

  export let form: Form;
  export const formPopup = {
    toggle() {
      backdrop.style.display = backdrop.style.display == 'none' ? 'flex' : 'none';
    },
    show() {
      backdrop.style.display = 'flex';
    },
    hide() {
      backdrop.style.display = 'none';
    }
  }

  onMount(() => {
    backdrop.addEventListener('click', () => formPopup.toggle());
  });
</script>

<style type="text/scss" scoped>
  .backdrop {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.4);
  }

  .container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--mdc-theme-background);
    display: flex;
    width: 500px;
    height: 500px;
  }
</style>