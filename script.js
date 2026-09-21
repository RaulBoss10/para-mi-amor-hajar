// script.js - versión final adaptada a móvil + recuerdos + pantalla final
(function () {
    var canvas = $('#canvas');

    if (!canvas[0] || !canvas[0].getContext) {
        $('#error').show();
        return false;
    }

    // El dibujo mantiene las coordenadas originales y el CSS lo adapta a móvil.
    var width = 1100;
    var height = 680;
    canvas.attr('width', width);
    canvas.attr('height', height);

    var opts = {
        seed: {
            x: width / 2 - 20,
            color: 'rgb(139, 69, 19)',
            scale: 4
        },
        branch: [
            [535, 680, 570, 250, 500, 200, 30, 100, [
                [540, 500, 455, 417, 340, 400, 13, 100, [
                    [450, 435, 434, 430, 394, 395, 2, 40]
                ]],
                [550, 445, 600, 356, 680, 345, 12, 100, [
                    [578, 400, 648, 409, 661, 426, 3, 80]
                ]],
                [539, 281, 537, 248, 534, 217, 3, 40],
                [546, 397, 413, 247, 328, 244, 9, 80, [
                    [427, 286, 383, 253, 371, 205, 2, 40],
                    [498, 345, 435, 315, 395, 330, 4, 60]
                ]],
                [546, 357, 608, 252, 678, 221, 6, 100, [
                    [590, 293, 646, 277, 648, 271, 2, 80]
                ]]
            ]]
        ],
        bloom: { num: 320, width: 1080, height: 650 },
        footer: { width: 1200, height: 5, speed: 10 }
    };

    var tree = new Tree(canvas[0], width, height, opts);
    var seed = tree.seed;
    var foot = tree.footer;
    var hold = 1;
    var finalShown = false;

    function canvasPoint(e) {
        var rect = canvas[0].getBoundingClientRect();
        return {
            x: (e.clientX - rect.left) * (width / rect.width),
            y: (e.clientY - rect.top) * (height / rect.height)
        };
    }

    function releaseSeed() {
        if (!hold) return;
        hold = 0;
        canvas.off('click.seed mousemove.seed');
        canvas.removeClass('hand');
    }

    canvas.on('click.seed', function (e) {
        var p = canvasPoint(e);
        if (seed.hover(p.x, p.y)) releaseSeed();
    }).on('mousemove.seed', function (e) {
        var p = canvasPoint(e);
        canvas.toggleClass('hand', seed.hover(p.x, p.y));
    });

    $(document).on('keydown', function (e) {
        if (e.keyCode === 13) releaseSeed();
    });

    var seedAnimate = eval(Jscex.compile('async', function () {
        seed.draw();
        while (hold) $await(Jscex.Async.sleep(10));
        while (seed.canScale()) {
            seed.scale(0.95);
            $await(Jscex.Async.sleep(10));
        }
        while (seed.canMove()) {
            seed.move(0, 2);
            foot.draw();
            $await(Jscex.Async.sleep(10));
        }
    }));

    var growAnimate = eval(Jscex.compile('async', function () {
        do {
            tree.grow();
            $await(Jscex.Async.sleep(10));
        } while (tree.canGrow());
    }));

    var flowAnimate = eval(Jscex.compile('async', function () {
        do {
            tree.flower(6);
            $await(Jscex.Async.sleep(10));
        } while (tree.canFlower());
    }));

    // La versión móvil no necesita el desplazamiento lateral del árbol original.
    // Ese efecto podía dejar la secuencia bloqueada después de las flores en
    // algunos navegadores. Cuando termina la floración pasamos directamente
    // al contenido, de forma fiable.

    var hajarStarted = false;

    function startClockAndText() {
        if (hajarStarted) return;
        hajarStarted = true;
        // Primer beso: 15 de mayo de 2026 aproximadamente a las 18:00.
        var together = new Date(2026, 4, 15, 18, 0, 0, 0);

        $('#clock-box').stop(true, true).fadeIn(500);
        prepareLetterPages();

        if (window.hajarClockTimer) clearInterval(window.hajarClockTimer);
        window.hajarClockTimer = setInterval(function () {
            timeElapse(together);
        }, 1000);
        timeElapse(together);
    }

    // Convierte la carta en varias "páginas" que caben siempre dentro del
    // rectángulo. Cada página se escribe, se mantiene un momento y se desvanece
    // antes de que aparezca la siguiente, así el texto nunca baja hasta el
    // contador ni se pierde fuera de la pantalla.
    function prepareLetterPages() {
        var source = $('#code');
        var panel = $('#text');

        if (!$('#letter-display').length) {
            panel.append('<div id="letter-display" aria-live="polite"></div>');
        }

        var display = $('#letter-display').empty();
        var text = source.text().replace(/\s+/g, ' ').trim();
        source.hide();

        // Empieza a escribir el mensaje de las flores exactamente al mismo
        // tiempo que empieza la carta de la izquierda.
        var flowerNote = $('#flower-note');
        var flowerText = flowerNote.text().replace(/\s+/g, ' ').trim();
        flowerNote.empty().append('<span class="flower-content"></span>');
        var flowerContent = flowerNote.find('.flower-content');
        var flowerIndex = 0;
        flowerNote.css('visibility', 'visible');

        function typeFlowerNote() {
            if (flowerIndex >= flowerText.length) return;
            flowerContent.text(flowerText.substring(0, flowerIndex + 1));
            flowerIndex++;
            var flowerDelay = 48;
            var flowerCh = flowerText.charAt(flowerIndex - 1);
            if (flowerCh === '.' || flowerCh === '!' || flowerCh === '❤️') flowerDelay = 280;
            setTimeout(typeFlowerNote, flowerDelay);
        }

        var cursor = $('<span class="letter-cursor">|</span>');
        display.append('<span class="letter-content"></span>').append(cursor);
        var content = display.find('.letter-content');
        var index = 0;

        // Escribe toda la carta de forma continua dentro del rectángulo.
        // El contenedor tiene overflow oculto para que nunca invada el contador.
        function typeNext() {
            if (index >= text.length) {
                cursor.hide();
                setTimeout(loadCouplePhotos, 3000);
                return;
            }

            content.text(text.substring(0, index + 1));
            index++;

            // Velocidad pausada y natural, con una pequeña pausa extra después de cada frase.
            var delay = 48;
            var ch = text.charAt(index - 1);
            if (ch === '.' || ch === '!' || ch === '❤️') delay = 280;
            setTimeout(typeNext, delay);
        }

        typeFlowerNote();
        typeNext();
    }

    function loadCouplePhotos() {
        if ($('#memories').hasClass('shown')) return;

        var photoFiles = [
            'imagenes/momentos/1.jpg',
            'imagenes/momentos/2.jpg',
            'imagenes/momentos/3.jpg',
            'imagenes/momentos/4.jpg',
            'imagenes/momentos/5.jpg'
        ];
        var loaded = 0;
        var attempted = 0;

        photoFiles.forEach(function (src) {
            var img = new Image();
            img.onload = function () {
                loaded++;
                var card = $('<div class="memory-card"></div>');
                var picture = $('<img loading="lazy" alt="Un recuerdo juntos">').attr('src', src);
                card.append(picture);
                $('#memory-gallery').append(card);
                attempted++;
                showMemoriesIfReady();
            };
            img.onerror = function () {
                attempted++;
                showMemoriesIfReady();
            };
            img.src = src;
        });

        function showMemoriesIfReady() {
            if (attempted !== photoFiles.length) return;
            if (loaded === 0) {
                showFinalScreen();
                return;
            }
            $('#memories').addClass('shown').fadeIn(900);
            setTimeout(showFinalScreen, 9000);
        }
    }

    function showFinalScreen() {
        if (finalShown) return;
        finalShown = true;
        $('#final-screen').attr('aria-hidden', 'false').addClass('show');
        $('html, body').css('overflow', 'hidden');
    }

    // Secuencia principal. Usamos las animaciones originales del árbol para
    // semilla, crecimiento y flores, y después mostramos la carta/contador.
    // No dependemos de una segunda animación infinita para continuar.
    var runAsync = eval(Jscex.compile('async', function () {
        $await(seedAnimate());
        $await(growAnimate());
        $await(flowAnimate());
        startClockAndText();
    }));

    runAsync().start();

    // Seguro de continuidad: si un navegador tarda demasiado dibujando las
    // flores, la carta no se queda bloqueada indefinidamente.
    window.setTimeout(function () {
        if ($('#code').is(':hidden')) startClockAndText();
    }, 12000);
})();
