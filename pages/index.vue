<script setup lang="ts">
/**
 * Landing Page
 * 
 * Clean, composed page that only handles:
 * - SEO metadata (useSeoMeta, useHead)
 * - Component composition
 */

// =============================================================================
// SEO META TAGS
// =============================================================================
const siteUrl = 'https://gabarita.ai'
const pageTitle = 'Gabarita.ai | Transforme PDFs em Flashcards com IA para Concursos e OAB'
const pageDescription = 'Pare de perder tempo resumindo. O Gabarita.ai lê seus PDFs de Lei Seca e Doutrina e cria Flashcards de revisão ativa instantaneamente. Teste grátis.'
const ogImage = `${siteUrl}/og-image.jpg`

useSeoMeta({
    // Primary Meta Tags
    title: pageTitle,
    description: pageDescription,

    // Robots
    robots: 'index, follow',

    // Open Graph / Facebook / WhatsApp / LinkedIn
    ogType: 'website',
    ogUrl: siteUrl,
    ogTitle: pageTitle,
    ogDescription: pageDescription,
    ogImage: ogImage,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: 'Gabarita.ai - Flashcards com IA para Concursos',
    ogLocale: 'pt_BR',
    ogSiteName: 'Gabarita.ai',

    // Twitter Card
    twitterCard: 'summary_large_image',
    twitterTitle: pageTitle,
    twitterDescription: pageDescription,
    twitterImage: ogImage,
    twitterImageAlt: 'Gabarita.ai - Flashcards com IA para Concursos',

    // Additional SEO
    author: 'Gabarita.ai',
    keywords: 'Flashcards com IA, Estudar Lei Seca, Resumo Automático PDF, Anki com Inteligência Artificial, Passar na OAB, Concursos Públicos, Estudar para OAB, Flashcards Direito',
})

// =============================================================================
// STRUCTURED DATA (JSON-LD) & CANONICAL
// =============================================================================
useHead({
    link: [
        { rel: 'canonical', href: siteUrl },
    ],
    script: [
        {
            type: 'application/ld+json',
            innerHTML: JSON.stringify({
                '@context': 'https://schema.org',
                '@type': 'SoftwareApplication',
                name: 'Gabarita.ai',
                description: pageDescription,
                url: siteUrl,
                applicationCategory: 'EducationalApplication',
                operatingSystem: 'Web',
                offers: {
                    '@type': 'Offer',
                    price: '0.00',
                    priceCurrency: 'BRL',
                    availability: 'https://schema.org/PreOrder',
                    description: 'Acesso antecipado gratuito via lista de espera',
                },
                author: {
                    '@type': 'Organization',
                    name: 'Gabarita.ai',
                    url: siteUrl,
                },
                aggregateRating: {
                    '@type': 'AggregateRating',
                    ratingValue: '5',
                    ratingCount: '1',
                    bestRating: '5',
                    worstRating: '1',
                },
            }),
        },
    ],
})
</script>

<template>
    <div class="min-h-screen bg-zinc-950 text-white">
        <!-- Toast Notifications -->
        <UNotifications />

        <!-- Page Sections -->
        <LandingHeroSection />
        <LandingPainPointSection />
        <LandingFeaturesGrid />
        <LandingPricingSection />
        <LandingSocialProof />
        <LandingTheFooter />
    </div>
</template>
