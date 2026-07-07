fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'oph3z-phone'
author 'Oph3Z'
description 'Advanced phone script for FiveM made by Oph3Z'
version '0.1.0'

shared_scripts {
    'config.lua',
    'GetCore.lua',
    'locales/*.lua',
    'shared/locale.lua',
}

client_scripts {
    'client/utilities.lua',
    'client/*.lua',
    'client/app/**/*.lua',
}

server_scripts {
    'server/utilities.lua',
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
    'web/build/gamerender/**/*',
    'web/build/mapStyles/**/*',
}