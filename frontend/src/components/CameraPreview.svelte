<div bind:this={container} class="container">
  <img src={`${camera.camUrl}/?action=stream`} alt="mjpeg stream">
  <div bind:this={controls} class='controls'>
    <Button variant="raised" style="flex: 1"><Label>Edit</Label></Button>
    <Button variant="raised" style="flex: 1"><Label>Record</Label></Button>
  </div>
</div>

<script lang="ts">
	import Button, { Label } from '@smui/button';
  import { onMount } from 'svelte';
  import type Camera from '../models/Camera';

  export let camera: Camera;

  let container: HTMLDivElement;
  let controls: HTMLDivElement;

  onMount(() => {
    container.addEventListener('mouseover', () => controls.style.opacity = '1');
    container.addEventListener('mouseout', () => controls.style.opacity = '0');
  });
</script>

<style type="text/scss" scoped>
  @use '../theme/media';

	.container {
    position: relative;
    width: 500px;
    min-width: 300px;
    min-height: calc(300px * 9 / 16);
    resize: horizontal;
    overflow: hidden;

    img {
      max-width: 100%;
      max-height: 100%;
      object-fit: cover;
    }

    .controls {
      $controls-padding: 20px;

      position: absolute;
      z-index: 1;
      bottom: 0;
      left: 0;
      display: flex;
      justify-content: space-evenly;
      gap: $controls-padding;
      padding: 0 $controls-padding;
      width: calc(100% - 2 * #{$controls-padding});
      min-height: 50px;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.5));
      opacity: 0;
      transition: opacity 0.5s;
    }
	}
</style>