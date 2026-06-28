fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'oph3z-phone'
author 'oph3z'
description 'A custom iPhone-style phone for QBox (Qbox framework)'
version '0.1.0'

-- Shared
shared_scripts {
    '@ox_lib/init.lua',
    'config.lua',
}

-- Client
client_scripts {
    'client/*.lua',
    'client/app/**/*.lua',
}

-- Server
server_scripts {
    'server/*.lua',
    'server/app/**/*.lua',
}

ui_page 'web/build/index.html'

files {
    'web/build/index.html',
    'web/build/assets/*.js',
    'web/build/assets/*.css',
    'web/build/assets/*.png',
    'web/build/assets/*.svg',
    'web/build/assets/*.jpg',
    'web/build/assets/*.webp',
    'web/build/assets/*.woff',
    'web/build/assets/*.woff2',
    'web/build/audio/*.ogg',
    'web/build/audio/*.mp3',
    'web/build/audio/*.wav',
    -- Live game-view renderer (CfxTexture Three.js) for the Camera viewfinder.
    'web/build/gamerender/**/*',
}

dependencies {
    'qbx_core',
    'ox_lib',
}