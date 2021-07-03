<div class="container">
  <Button variant="raised" on:click={showForm}><Label>Add Camera</Label></Button>
</div>
<FormPopup bind:formPopup={formPopup} form={form}></FormPopup>

<script lang="ts">
	import Button, { Label } from '@smui/button';
	import { createEventDispatcher, onMount, SvelteComponent } from 'svelte';
	import type Form from '../models/Form';
	import FormPopup from './FormPopup.svelte';

	const dispatch = createEventDispatcher();
	const form: Form = {
		title: 'Add Camera',
		inputs: [
			{ type: 'text', name: 'name' },
			{ type: 'text', name: 'url' },
		]
	};
	let formPopup;

	function showForm() {
		// dispatch('addCamera', {
		// 	name: 'room',
		// 	camUrl: 'http://192.168.1.70:8080',
		// });
		formPopup.toggle();
	}
</script>

<style type="text/scss" scoped>
	.container {
		display: flex;
		justify-content: center;
		align-items: center;
		height: 50px;
	}
	
	.form-popup {
		visibility: 0;
	}
</style>