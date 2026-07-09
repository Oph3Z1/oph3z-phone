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
    'server/app/camera/videomux.js',
}

ui_page 'build/index.html'

files {
    'build/index.html',
    'build/assets/*.js',
    'build/assets/*.css',
    'build/assets/*.png',
    'build/assets/*.svg',
    'build/assets/*.jpg',
    'build/assets/*.webp',
    'build/assets/*.woff',
    'build/assets/*.woff2',
    'build/audio/*.ogg',
    'build/audio/*.mp3',
    'build/audio/*.wav',
    'build/gamerender/**/*',
    'build/mapStyles/**/*',
}