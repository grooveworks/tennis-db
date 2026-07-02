// ==UserScript==
// @name         Racketpedia personal capture
// @namespace    tennisdb.local
// @version      1.1
// @description  自分が閲覧した弦/ラケットのページを、ローカルの受け口へ自動送信して個人記録化する(個人利用限定・巡回はしない)
// @match        https://www.racketpedia.com/en-GB/tennis-string/*
// @match        https://www.racketpedia.com/en-GB/tennis-racket/*
// @run-at       document-idle
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @connect      localhost
// @connect      127.0.0.1
// ==/UserScript==
(function () {
  'use strict';
  var ENDPOINT = 'http://127.0.0.1:8765/ingest';
  var HYDRATE_WAIT = 2500; // 予備経路(画面の中身)用: グラフ等の描画を待つ
  var QUEUE_KEY = 'rp_queue';

  function post(html, onok, onfail) {
    GM_xmlhttpRequest({
      method: 'POST', url: ENDPOINT,
      headers: { 'Content-Type': 'text/html;charset=utf-8' },
      data: html, timeout: 8000,
      onload: function (r) { (r.status >= 200 && r.status < 300) ? onok() : onfail(); },
      onerror: onfail, ontimeout: onfail
    });
  }

  function enqueue(html) { // 受け口が止まっていても取りこぼさない
    var q = GM_getValue(QUEUE_KEY, []);
    q.push({ url: location.href, html: html });
    GM_setValue(QUEUE_KEY, q.slice(-80)); // 上限80件
  }

  function flush() { // 次に受け口が応答したら溜まった分を流す
    var q = GM_getValue(QUEUE_KEY, []);
    if (!q.length) return;
    var item = q[0];
    post(item.html,
      function () { var qq = GM_getValue(QUEUE_KEY, []); qq.shift(); GM_setValue(QUEUE_KEY, qq); flush(); },
      function () {/* まだ繋がらない: 次回 */ });
  }

  function snapshot() { return '<!DOCTYPE html>\n' + document.documentElement.outerHTML; }

  function send(html) { post(html, flush, function () { enqueue(html); }); }

  // v1.1: 画面の中身(自動翻訳で日本語化され得る)ではなく、サーバー原文(常に英語)を取り寄せて送る。
  // ログイン中は cookie 同送なので会員ページも原文で取れる想定。
  // 原文の取り寄せに失敗した時だけ、旧方式(画面の中身)に自動で切り替える。
  function captureOriginal() {
    fetch(location.href, { credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (html) { send(html); })
      .catch(function () { // 予備経路: 描画を待ってから画面の中身を送る
        setTimeout(function () { send(snapshot()); }, HYDRATE_WAIT);
      });
  }

  captureOriginal();
})();
