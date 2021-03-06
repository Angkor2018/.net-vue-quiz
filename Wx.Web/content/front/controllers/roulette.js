﻿/// <reference path="../scripts/linq.js" />
define(['vue_util', 'vue_focus'], function (vue_util, vue_focus) {
    var bgImgs = { lol: 'lol.jpg?v=2', dota: 'dota.jpg?v=1' };
    return function (controller) {
        var data = {
            time: null,
            name: null,
            locked: false,
            apiData: null,
            interval: false,
            selections: [],
            odd: null,
            history: null,
            currentRollHeroIndex: 0,
            currentRollPosition: 0,
            roll_img_width: controller.context.params.gameType == "lol" ? 122 : 161,
            gameType: controller.context.params.gameType,
            submitform: {
                show: false,
                title: '',
                selectNames: '',
                odds: '',
                expect_income: 0,
                user_balance: 0,
                message: '',
                golds: null
            },
            messageform: {
                show: false,
                message: ''
            },
            back_ground_image: "url('/content/front/design/images/roulette/bg-roulette-roll-" + bgImgs[controller.context.params.gameType] + "')"
            //back_ground_image: "url('/content/front/design/images/roulette/bg-roulette-roll-lol.jpg')"
        };
        var vm = {
            data: data,
            mixins: [vue_focus.mixin],
            directives: { focusAuto: vue_focus.focusAuto },
            methods: {
                afterRender: function (vm) {
                    vm.indexVm.tabIndex = 1;
                    this.refresh();
                    //new ZoomPic('jswbox');
                },
                ontimer: function (response) {
                    data.time = response.timer;
                    data.name = response.name;
                },
                onHistoryChange: function (history) {
                    //console.log(history);
                    data.history = history;
                },
                //onresolved: function (response) {
                //	data.locked = false;
                //	var message = data.name + "的幸运英雄是" + data.heroName + "!";
                //	vue_util.showMessage(message, function (vm) {
                //		setTimeout(function () {
                //			vm.messageform.message = null;
                //		}, 10000);
                //	});
                //},
                startInterval: function () {
                    if (data.interval) return;
                    data.interval = setInterval(function () {
                        data.currentRollHeroIndex = (++data.currentRollHeroIndex) % 112;
                        if (data.time > 0)
                            data.time--;
                        data.locked = data.time < 15;
                        if (data.time < 0) {
                            this.stopInterval();
                            this.refresh();
                            setTimeout(function () { this.refresh() }.bind(this), 80 * 1000);
                        }
                    }.bind(this), 1000);
                },
                stopInterval: function () {
                    if (data.interval) {
                        clearInterval(data.interval);
                        clearInterval(data.interval2);
                        data.interval = false;
                    }
                },

                refresh: function () {
                    Vue.http.get('Roulette/getRouletteInfo').then(function (response) {
                        if (vm.destroyed) return;
                        if (response.data.success) {
                            vm.hero_propertys = response.data.data.hero_propertys;
                            delete response.data.data.hero_propertys;
                            this.ontimer(response.data.data.sscTimer);
                            this.onHistoryChange(response.data.data.sscHistory.history.slice(0));
                            delete response.data.data.sscTimer;
                            delete response.data.data.sscHistory;

                            data.apiData = response.data.data;
                            data.selections = [];

                            this.startInterval();
                        } else {
                            this.stopInterval();
                            alert(response.data.message);
                        }
                    }.bind(this));
                },
                optionClick: function (quiz, option, another_option) {
                    vue_util.showSubmitForm(quiz, option, {}, data.apiData.user.user_balance, this.refresh.bind(this));
                },
                getSelections: function (property_types) {
                    var selections = property_types.selectMany(function (i) { return i.propertys; })
                        .where(function (r) { return r.active });
                    //.select(function (r) { return r.propertyId + '' });
                    data.selections = selections.slice(0);
                    return selections;
                },
                caculateOdd: function (selectIds) {
                    var matchHeros = vm.hero_propertys.where(function (arr) { return selectIds.all(function (p) { return arr.contains(parseInt(p)); }); });//.length;
                    //console.log(matchHeros);
                    if (matchHeros.length == 0) return 0;
                    var allHeros = vm.hero_propertys.length;
                    var odd = allHeros / matchHeros.length;
                    return odd.toFixed(2);
                },
                toggleSelectionClick: function (property, property_type, property_types) {
                    property.active = !property.active;
                    for (var i = 0; i < property_type.propertys.length; i++) {
                        var item = property_type.propertys[i];
                        if (item == property) continue;
                        item.active = false;
                    }
                    var selectProIds = this.getSelections(property_types).select(function (r) { return r.propertyId + '' });
                    data.odd = this.caculateOdd(selectProIds);
                },
                btnSubmitClick: function () {
                    if (data.selections.length == 0) return;
                    if (data.odd == 0) {
                        data.messageform.message = "当前组合赔率为0，请重新选择！";
                        data.messageform.show = true;
                        return;
                    }
                    var selectPropertyIds = data.selections.slice(0);
                    data.submitform.show = true;
                    var selections = this.getSelections(data.apiData.property_types);
                    var selectNames = selections.select(function (r) { return r.name });
                    var selectIds = selections.select(function (r) { return r.propertyId + '' });
                    data.submitform.title = '英雄猜';
                    data.submitform.selectNames = selectNames;
                    data.submitform.odds = this.caculateOdd(selectIds);
                    //data.apiData.hero_propertys;



                    return;
                    var submit_data = {
                        showMask: true,
                        title: 'tt'
                    };
                    vue_util.loadPopups({ data: submit_data }).then(function () { console.log('popup resolved;'); });
                    return;



                },
                submitClick: function () {
                    var selections = this.getSelections(data.apiData.property_types);
                    var selectIds = selections.select(function (r) { return r.propertyId + '' });
                    var _this = this;
                    if (!(data.submitform.golds > 0)) {
                        data.messageform.show = true;
                        data.messageform.message = "至少投注1金币";
                        return;
                    }
                    Vue.http.post('Roulette/submit', { selectPropertyIds: selectIds, golds: data.submitform.golds })
                        .then(function (response) {
                            return new Promise(function (resolve, reject) {
                                if (response.data.success) {
                                    data.submitform.golds = null;
                                    data.submitform.show = false;
                                    _this.refresh();
                                }
                                resolve(response.data.message);
                            });
                        }.bind(this))
                        .then(function (message) {
                            data.messageform.show = true;
                            data.messageform.message = message;
                        });
                },
                cancelClick: function () {
                    data.submitform.golds = null;
                    data.submitform.show = false;
                },
                messageOKClick: function () {
                    data.messageform.show = false;
                    data.messageform.message = null;
                },
                onDestroy: function (vm) {
                    clearInterval(data.interval);
                    this.stopInterval();
                    vm.destroyed = true;
                }
            },
            computed: {
                fomartTime: function () {
                    var m = parseInt(data.time / 60);
                    var s = parseInt(data.time - m * 60);
                    return (m == 0 ? '' : (m + '分')) + s + '秒';
                },
                showMask: function () {
                    return data.submitform.show || data.messageform.show;
                },
                expect_income: function () {
                    return (data.submitform.odds || 0) * (data.submitform.golds || 0);
                }
            }
        };
        return vm;
    };
});
