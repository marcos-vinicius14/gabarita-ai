<template>
  <div>
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <UNotifications :ui="{
      position: 'top-0 bottom-auto',
      container: 'flex flex-col gap-3 p-4'
    }" />
  </div>
</template>
