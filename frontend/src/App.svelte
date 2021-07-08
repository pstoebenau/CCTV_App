<script lang="ts">
	import Router from "svelte-spa-router";
	import Dashboard from './views/Dashboard.svelte';
	import Recordings from './views/Recordings.svelte';

	const routes = {
		'/': Dashboard,
		'/recordings/:camName': Recordings,
	};
</script>

<Router routes={routes}>
</Router>