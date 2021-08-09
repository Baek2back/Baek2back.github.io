---
emoji: 🧩
title: Transducing
date: '2021-08-09 23:00:00'
author: Baek2back
tags: transduce transducer 지연 평가 lazy evaluation reducer
categories: 자바스크립트
---

```javascript
const isOdd = (x) => x % 2 === 1;
const add = (x) => (y) => x + y;

const arr = [1, 2, 3, 4, 5];

arr
  .map(square) // [ 1 → 1, 2 → 4, 3 → 9, 4 → 16, 5 → 25 ]
  .map(add(3)); // [ 1 → 4, 4 → 7, 9 → 12, 16 → 19, 25 → 28 ]
```

위의 상황에서 코드는 문제없이 동작하지만 많은 요소를 갖는 배열에 대해서는 `Array.prototype.map`을 호출할 때마다 즉, 메서드 체이닝을 수행할 때마다 원본 배열과 동일한 크기의 중간 배열을 지속적으로 생성한다는 문제가 있다. 또한 이전 메서드의 호출 결과가 반환되기 이전에는 다음 메서드 호출이 수행되지 않으므로 각 메서드의 수행 시간을 모두 합친 만큼의 blocking이 발생하게 될 것이다.

그렇다면 중간 배열을 생성하지 않고, 최종 결과로 반환될 배열만 추가로 생성하게끔 구현하려면 어떻게 해야할까?

첫 번째 아이디어로는 인접한 `mapping` 함수들을 합성하는 방식을 떠올릴 수 있을 것이다.

```javascript
arr.map(pipe(square, add(3)));
// [ 1 → 1 → 4, 2 → 4 → 7, 3 → 9 → 12, 4 → 16 → 19, 5 → 25 → 28]
```

그렇다면 이번에는 `Array.prototype.filter`를 체이닝하여 사용하는 경우를 살펴보자.

```javascript
const isLongEnough = (str) => 1 <= str.length;
const isShortEnough = (str) => str.length <= 3;

const strings = ['abc', 'def', 'gh', '', 'ijkl'];

strings
  .filter(isShortEnough) // [ "abc", "def", "gh", "ijkl" ]
  .filter(isLongEnough); // [ "abc", "def", "gh" ]
```

`mapping` 함수의 경우와 마찬가지로 중간 배열을 계속해서 생성하므로 앞선 경우처럼 인접한 `predicate` 함수들을 합성하는 방식을 가장 먼저 시도해 볼 수 있을 것이다.

```javascript
strings.filter(pipe(isShortEnough, isLongEnough)); // [] (?)

const tap = (fn) => (value) => {
  fn(value);
  return value;
};

strings.filter(pipe(isShortEnough, tap(console.log), isLongEnough));
// true, true, true, true, false

true.length; // undefined
```

이 경우 문제는 `predicate` 함수의 반환 결과는 `boolean`이라는 것이다. `isLongEnough`의 시그니처를 살펴보면 `string` 타입의 값을 인수로 기대하기 때문에 의도대로 동작하지 않게 되는 것이다.

```javascript
strings
  .map(strUpperCase) // ["ABC", "DEF", "GH", "", "IJKL"]
  .filter(isLongEnough) // ["ABC", "DEF", "GH", "IJKL"]
  .filter(isShortEnough) // ["ABC", "DEF", "GH"]
  .reduce(strConcat, ''); // "ABCDEFGH"
```

거기에 만약 `Array.prototype.reduce`도 함께 사용해야 하는 경우라면 `predicate` 함수가 반환하는 `boolean`타입의 값은 `reducer` 함수와 선택적으로 `initialValue`를 인수로 제공해야 하는 `reduce` 함수의 시그니처와의 불일치가 발생하게 된다.

## Reducers

그렇다면 이제 두 번째로 고려해볼 수 있는 방법은 합성을 수행할 모든 함수를 동일한 형태의 함수(동일한 시그니처를 갖는 함수)로 만드는 것이 될 수 있을 것이다.

먼저 `reduce`는 요소를 순회하면서 `fold`를 수행하고 이를 단일 출력 값으로 만들어내게 된다. 이때 `fold`란 다음과 같이 단일 출력을 생성하는 이진 연산을 의미한다.

> `foldLeft`는 일반적으로 우리가 알고 있는 `reduce` 연산을 의미하고, `foldRight`는 `reduceRight`를 생각하면 된다.

```javascript
// Sum: (1, 2) => 3
const add = (a, b) => a + b;

// Product: (2, 4) => 8
const multiply = (a, b) => a * b;

// String concatenation: ("abc", "123") => "abc123"
const concatString = (a, b) => a + b;

// Array concatenation: ([1,2], [3,4]) => [1,2,3,4]
const concatArray = (a, b) => [...a, ...b];
```

따라서 `map`, `filter`와 동일하게 동작할 수 있도록 `reducer`를 구현하고 이를 `reduce`에 전달하는 방식으로 변경해보자.

```javascript
const strUpperCase = (str) => str.toUpperCase();

function strConcatReducer(str1, str2) {
  return str1 + str2;
}

function strUpperCaseReducer(list, str) {
  return [...list, strUpperCase(str)];
}

function isLongEnoughReducer(list, str) {
  if (isLongEnough(str)) return [...list, str];
  return list;
}

function isShortEnoughReducer(list, str) {
  if (isShortEnough(str)) return [...list, str];
  return list;
}

strings
  .reduce(strUpperCaseReducer, [])
  .reduce(isLongEnoughReducer, [])
  .reduce(isShortEnoughReducer, [])
  .reduce(strConcatReducer, '');
```

하지만 여전히 `reducer`를 합성하는 것에는 문제가 있다. `reducer`는 두 개의 인수를 전달받고 하나의 값을 반환하기 때문에 이전 `reducer`의 출력을 다음 `reducer`의 입력으로 전달하는 것이 불가능하기 때문이다.

```javascript
f: (a, b) => c;
g:           (a, b) => c;
```

그 대신 `reducer` 자체를 전달받아 다시 `reducer`를 반환하는 형태라면 합성이 가능해질 것이다.

```javascript
    [ reducer ]      [ reducer ]
f: ((a, b) => c) => ((a, b) => c)     [ reducer ]
g:                  ((a, b) => c) => ((a, b) => c)
```

앞서 구현한 `reducer`들을 살펴보면 먼저 `mapping` 함수 혹은 `predicate` 함수를 적용하는 부분은 매개변수를 통해 전달받게끔 만드는 것이 가능할 것이다.

```javascript
function mapReducer(mapperFn) {
  return function reducer(list, val) {
    return [...list, mapperFn(val)];
  };
}

const strUpperCaseReducer = mapReducer(strUpperCase);

function filterReducer(predicateFn) {
  return function reducer(list, val) {
    if (predicateFn(val)) return [...list, val];
    return list;
  };
}

const isLongEnoughReducer = filterReducer(isLongEnough);
const isShortEnoughReducer = filterReducer(isShortEnough);
```

또한 리스트를 반환하는 부분 역시 매개변수로 추출하는 것이 가능하다.

```javascript
function listCombine(list, val) {
	return [...list, val];
}

function mapReducer(mapperFn, combineFn) {
	return function reducer(list, val) {
		return combineFn(list, mapperFn(val));
	};
}

function filterReducer(predicateFn, combineFn) {
	return function reducer(list, val) {
		if (predicateFn(val)) return combineFn(list, val);
		return list;
	};
}

const strUpperCaseReducer = mapReducer(
	strUpperCase,
	listCombine
);

const isLongEnoughReducer = filterReducer(
	isLongEnough,
	listCombine
);

const isShortEnoughReducer = filterReducer(
	isShortEnough,
	listCombine
);
```

마지막으로 `currying`까지 적용해두자.

```javascript
const curriedFilterReducer = curry(function filterReducer(
	predicateFn,
	combineFn
) {
	return function reducer(list, val) {
		if (predicateFn(val)) return combineFn(list, val);
		return list;
	};
});

const curriedMapReducer = curry(function mapReducer(
	mapperFn,
	combineFn
) {
	return function reducer(list, val) {
		return combineFn(list, mapperFn(val));
	};
});

const strUpperCaseReducer =
	curriedMapReducer(strUpperCase)(listCombine);

const isLongEnoughReducer = 
	curriedFilterReducer(isLongEnough)(listCombine);

const isShortEnoughReducer = 
	curriedFilterReducer(isShortEnough)(listCombine);
```

## Composing Reducers

새롭게 정의한 `reducer`들은 모두 `listCombine`을 마지막 인수로 전달받는다는 공통점이 있다. 따라서 `listCombine`을 전달하기 이전의 함수들은 미리 합성하는 방법을 생각할 수 있다.

그렇다면 먼저 `listCombine`을 전달하지 않은 상태의 함수를 생각해보자.

```javascript
const x = curriedMapReducer(strUpperCase);
// const strToUpperCaseReducer = x(listCombine);

const y = curriedFilterReducer(isLongEnough);
// const isLongEnoughReducer = y(listCombine);

const z = curriedFilterReducer(isShortEnough);
// const isShortEnoughReducer = z(listCombine); 
```

3개의 함수를 합성하기 이전에 우선 2개의 함수를 합성하는 경우를 살펴보자. 먼저 `y`와 `z`를 합성하는 경우이다. 이 경우 함수 합성은 `y(z)`의 형태로 수행될 것이다.

```javascript
// y(z)
function reducer(list, val) {
	if (isLongEnough(val)) return z(list, val);
	return list;
}

// z
(combineFn) => {
	return function reducer(list, val) {
		if (isShortEnough(val)) return combineFn(list, val);
		return list;
	}
};
```

`z`는 하나의 인수(`combineFn`)만을 기대하는 상황이므로 두 개의 인수(`list`, `val`)을 전달하게 되면 인수의 타입과 갯수가 일치하지 않아 제대로 동작하지 않을 것이다.

그렇다면 `y(z)` 대신 `y(z(listCombine))`의 형태로 합성한 상황을 살펴보자. 이 경우에는 인수의 갯수가 동일하므로 무리없이 합성이 수행될 것이다.

```javascript{5, 13}
const shortEnoughReducer = z(listCombine);
const longAndShortEnoughReducer = y(shortEnoughReducer);

// z(listCombine)
function reducer(list, val) {
	if (isShortEnough(val)) return listCombine(list, val);
	return list;
}

// y(z(listCombine)
function reducer(list, val) {
	if (isLongEnough(val)) {
		return z(listCombine)(list, val);
	}
	return list;
}

longAndShortEnoughReducer([], "1"); // ["1"]
longAndShortEnoughReducer([], "1234"); // []
```

또한 `x(y(z(listCombine)))`의 형태는 `compose(x, y, z)(listCombine)`과 동일하므로 다음과 같이 사용하는 것도 가능할 것이다.

```javascript
const composition = compose(
	curriedMapReducer(strUpperCase),
	curriedFilterReducer(isLongEnough),
	curriedFilterReducer(isShortEnough)
);

const upperLongAndShortEnoughReducer = composition(listCombine);

// x(y(z(listCombine)))
function reducer(list, val) {
	return y(z(listCombine))(list, strUpperCase(val));
};


strings.reduce(upperLongAndShortEnoughReducer, []);
```

이때 `composition`과 같은 역할을 수행하는 함수를 `transducer`라 한다. 즉, `reducer`를 전달받아 다시 `reducer`를 반환하는 **Higher-Order-Reducer**의 역할을 수행하게 된다.  따라서 각각의 연산에 대해 하나씩 적용을 완료한 리스트를 반환하는 것(중간 컬렉션 생성)이 아니라 각 요소를 순차적으로 순회하면서 **요소 별로 합성된 연산을 수행**할 수 있게 되는 것이다.

최종 코드는 다음과 같다.

```javascript
const transducerMap = curry(function mapReducer(
	mapperFn,
	combineFn
) {
	return function reducer(list, v) {
		return combineFn(list, mapperFn(v));
	};
});

const transduceFilter = curry(function filterReducer(
	predicateFn,
	combineFn
) {
	return function reducer(list, v) {
		if (predicateFn(v)) return combineFn(list, v);
		return list;
	};
});

const transducer = compose(
	transduceMap(strUpperCase),
	transduceFilter(isLongEnough),
	transduceFilter(isShortEnough)
);

function transduce(
	transducer,
	combineFn,
	initialValue,
	list
) {
	const reducer = transducer(combineFn);
	return list.reduce(reducer, initialValue);
}

transduce(transducer, listCombine, [], strings);
// ["ABC", "DEF", "GH"]
transduce(transducer, strConcat, "", strings);
// "ABCDEFGH"
```

## 결론

```javascript{5}
export default function combineReducers(reducers) {
  return function combination(state = {}, action) {
    const newState = {};
    for (const key in reducers) {
      newState[key] = reducers[key](state[key], action);
    }
    return newState;
  };
}
```

- `redux`의 `combineReducers`가 반환하는 `combination` 내부를 살펴보면 상태를 변경시키는 모든 연산이 `reducer` 단위로 이루어지는 것을 확인할 수 있다.
- 최종적인 연산의 결과는 새로운 객체이지만 갱신을 수행하면서 내부적으로 `newState`라는 객체를 공유하는 것을 알 수 있다.
- 즉, `Transducing`이나 `redux`에서나 **Structural Sharing**을 최대한 활용하는 방향으로 갱신을 수행하는 것으로 판단된다.
- 또 합성이나 연산의 단위를 기본적으로 이진 연산을 수행하는 `reducer`로 가져가면서 일관된 인터페이스를 유지할 수 있게 하는 것 같다.
- 현재 구현에서는 배열을 기준으로 작성하였지만, `[Symbol.iterator]` 메서드를 구현한 객체(이터러블)라면 `Transducing`의 대상이 되게끔 만들어 볼 수 있을 것이다.