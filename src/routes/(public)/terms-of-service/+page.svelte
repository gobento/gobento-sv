<script lang="ts">
	import { resolve } from '$app/paths';
	import PublicPage from '#lib/components/account/PublicPage.svelte';
	import Seo from '#lib/components/layout/Seo.svelte';
</script>

<Seo
	title="Terms of service · GoBento"
	description="The rules for using GoBento to offer and rescue surplus food."
/>

<PublicPage
	eyebrow="Legal"
	title="Terms of service"
	description="Effective 19 July 2025 · Last updated 19 July 2025"
	prose
>
	<h2>1. What GoBento is</h2>
	<p>
		GoBento is a marketplace that connects businesses with surplus food to people who want to buy it
		at a reduced price, and to charities that collect donated food. GoBento arranges the reservation
		and payment; the food itself is sold or donated by the business that lists it.
	</p>

	<h2>2. Your account</h2>
	<ul>
		<li>You sign in with a Google account and are responsible for keeping it secure.</li>
		<li>The details you give us (business, charity and payment information) must be accurate.</li>
		<li>
			Business and charity accounts are reviewed by our team before they go live and can be
			suspended if the details turn out to be wrong.
		</li>
	</ul>

	<h2>3. Reservations and pickup</h2>
	<ul>
		<li>A reservation is confirmed once payment has been received.</li>
		<li>
			Food must be collected at the listed location within the pickup window shown on the offer.
			Reservations that are not collected in time expire.
		</li>
		<li>
			Offers are surplus food: contents can vary and are described by the business as accurately as
			possible. Ask the business about allergens before you eat.
		</li>
	</ul>

	<h2>4. Payments and fees</h2>
	<p>
		Prices are shown before you reserve. Payments are made with the payment method you configure in
		your profile. Businesses receive their earnings as payouts, less the service fee shown in their
		payment overview.
	</p>

	<h2>5. Rules for businesses</h2>
	<ul>
		<li>Only list food that is safe to eat and complies with the food law that applies to you.</li>
		<li>Honour every confirmed reservation, or cancel it so the customer is refunded.</li>
		<li>Describe offers, pickup times and locations truthfully.</li>
	</ul>

	<h2>6. Rules for everyone</h2>
	<ul>
		<li>Do not misuse the service, attempt to access other accounts or disrupt its operation.</li>
		<li>Do not resell collected food or use donations for anything other than their purpose.</li>
		<li>Treat staff, customers and volunteers with respect.</li>
	</ul>

	<h2>7. Problems and complaints</h2>
	<p>
		If something is wrong with an order, report it from the reservation in the app or through our
		<a href={resolve('/(public)/contact')}>contact page</a>. We look into every report and may
		refund a payment or act against an account where that is justified.
	</p>

	<h2>8. Liability</h2>
	<p>
		The business that lists an offer is responsible for the food it hands over. GoBento is liable
		for its own service to the extent required by law, and not for the quality of food provided by
		third parties.
	</p>

	<h2>9. Ending your use</h2>
	<p>
		You can stop using GoBento at any time and ask us to delete your account. We may suspend or
		close accounts that break these terms.
	</p>

	<h2>10. Changes</h2>
	<p>
		We may update these terms when the service changes. The date at the top shows the latest
		version; continuing to use GoBento after a change means you accept it.
	</p>

	<h2>11. Contact</h2>
	<p>
		Questions about these terms? Reach us through the <a href={resolve('/(public)/contact')}
			>contact page</a
		>. How we handle personal data is described in the
		<a href={resolve('/(public)/privacy-policy')}>privacy policy</a>.
	</p>
</PublicPage>
