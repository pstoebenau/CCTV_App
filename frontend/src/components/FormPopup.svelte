<div bind:this={backdrop} class="backdrop" style='display: none;'>
  <div bind:this={container} class="container">
    <h2>Add a Camera</h2>
    <Textfield style="width: 100%;" variant="outlined" bind:value={camName} label="Camera Name"/>
    <Textfield style="width: 100%;" variant="outlined" bind:value={camUrl} label="Camera URL"/>
    <Button style="width: 200px;" variant="raised" on:click={addCamera}><Label>Add</Label></Button>
  </div>
</div>

<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import Textfield from '@smui/textfield';
  import Button, { Label } from '@smui/button';

  import type Form from '../models/Form';

  let backdrop: HTMLDivElement;
  let container: HTMLDivElement;
  
  let camName: string = '';
  let camUrl: string = '';

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

  const dispatch = createEventDispatcher();

  function addCamera() {
    formPopup.toggle();
    dispatch('addCamera', {
			name: camName,
			camUrl: camUrl,
		});
  }
</script>

<style type="text/scss" scoped>
  .container {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--mdc-theme-surface);
    display: flex;
    flex-direction: column;
    justify-content: space-evenly;
    align-items: center;
    width: 500px;
    padding: 50px;
    gap: 50px;
  }
</style>