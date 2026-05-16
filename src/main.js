import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ruatzgleuoqnmaacbpet.supabase.co'
const SUPABASE_KEY = 'sb_publishable_5dVAyquuvdCHfSOSxmavYw_QBUvGz-N'
const HABITS_TABLE = 'habit-data'
const HASH_PREFIX = '#habit-'
const PROTOTYPE_USER_ID = 'f4ffff19-dd3c-408c-a653-64b7fa42e1dc'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const habitsDiv = document.querySelector('#habits')
const form = document.querySelector('#new-habit-form')
const input = document.querySelector('#new-habit-input')

let habits = []
let notice = ''

function createTextElement(tagName, className, text) {
  const element = document.createElement(tagName)

  if (className) {
    element.className = className
  }

  element.textContent = text
  return element
}

function getHabitHash(id) {
  return `${HASH_PREFIX}${encodeURIComponent(String(id))}`
}

function getSelectedHabitId() {
  if (!window.location.hash.startsWith(HASH_PREFIX)) {
    return null
  }

  return decodeURIComponent(window.location.hash.slice(HASH_PREFIX.length))
}

function getCountLabel(count) {
  if (count === 1) {
    return '1 time'
  }

  return `${count} times`
}

function parseHabitDate(value) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date
}

function formatLocalDateTime(value) {
  const date = parseHabitDate(value)

  if (!date) {
    return 'Never'
  }

  return date.toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

function getCompletionMarks(count) {
  return 'X'.repeat(Math.max(count, 0))
}

function showNotice(message, error) {
  notice = message
  console.error(error)
  renderApp()
}

function clearNotice() {
  notice = ''
}

function renderNotice() {
  if (!notice) {
    return null
  }

  return createTextElement('p', 'app-notice', notice)
}

function openHabitDetail(id) {
  window.history.pushState(
    { view: 'habit-detail', habitId: id },
    '',
    getHabitHash(id),
  )
  renderApp()
}

function closeHabitDetail() {
  if (window.history.state?.view === 'habit-detail') {
    window.history.back()
    return
  }

  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}`,
  )
  renderApp()
}

function renderApp() {
  const selectedHabitId = getSelectedHabitId()
  const selectedHabit = habits.find((habit) => String(habit.id) === selectedHabitId)

  if (selectedHabitId) {
    form.hidden = true
    renderHabitDetail(selectedHabit)
    return
  }

  form.hidden = false
  renderHabitList()
}

function renderHabitList() {
  habitsDiv.replaceChildren()

  const noticeElement = renderNotice()

  if (noticeElement) {
    habitsDiv.appendChild(noticeElement)
  }

  if (habits.length === 0) {
    habitsDiv.appendChild(
      createTextElement('p', 'empty-state', 'No habits yet. Add one below.'),
    )
    return
  }

  habits.forEach((habit) => {
    habitsDiv.appendChild(createHabitCard(habit))
  })
}

function createHabitCard(habit) {
  const row = document.createElement('article')
  const count = habit.num_times_performed ?? 0

  row.className = 'habit-card'
  row.tabIndex = 0
  row.setAttribute('role', 'button')
  row.setAttribute('aria-label', `View ${habit.habit_label}`)

  const info = document.createElement('div')
  info.className = 'habit-info'
  info.append(
    createTextElement('div', 'habit-title', habit.habit_label),
    createTextElement(
      'div',
      'habit-meta',
      formatLocalDateTime(habit.time_most_recently_performed_at),
    ),
    createTextElement('div', 'habit-marks', getCompletionMarks(count)),
  )

  const plusButton = document.createElement('button')
  plusButton.className = 'plus-button'
  plusButton.type = 'button'
  plusButton.textContent = '+'
  plusButton.setAttribute('aria-label', `Add one completion for ${habit.habit_label}`)

  row.append(info, plusButton)

  row.addEventListener('click', () => {
    openHabitDetail(habit.id)
  })

  row.addEventListener('keydown', (event) => {
    if (event.target !== row || !['Enter', ' '].includes(event.key)) {
      return
    }

    event.preventDefault()
    openHabitDetail(habit.id)
  })

  plusButton.addEventListener('click', async (event) => {
    event.stopPropagation()
    await incrementHabit(habit, plusButton)
  })

  return row
}

function renderHabitDetail(habit) {
  habitsDiv.replaceChildren()

  const detail = document.createElement('section')
  detail.className = 'detail-view'

  const backButton = document.createElement('button')
  backButton.className = 'back-button'
  backButton.type = 'button'
  backButton.textContent = 'Back'
  backButton.addEventListener('click', closeHabitDetail)

  detail.appendChild(backButton)

  const noticeElement = renderNotice()

  if (noticeElement) {
    detail.appendChild(noticeElement)
  }

  if (!habit) {
    detail.append(
      createTextElement('h2', 'detail-title', 'Habit not found'),
      createTextElement(
        'p',
        'empty-state',
        'That habit is not in the current list anymore.',
      ),
    )
    habitsDiv.appendChild(detail)
    return
  }

  const count = habit.num_times_performed ?? 0
  const header = document.createElement('div')
  header.className = 'detail-header'

  const headingGroup = document.createElement('div')
  headingGroup.append(
    createTextElement('p', 'detail-eyebrow', 'Habit detail'),
    createTextElement('h2', 'detail-title', habit.habit_label),
  )

  const addButton = document.createElement('button')
  addButton.className = 'detail-plus-button'
  addButton.type = 'button'
  addButton.textContent = '+'
  addButton.setAttribute('aria-label', `Add one completion for ${habit.habit_label}`)
  addButton.addEventListener('click', async () => {
    await incrementHabit(habit, addButton)
  })

  const deleteButton = document.createElement('button')
  deleteButton.className = 'detail-delete-button'
  deleteButton.type = 'button'
  deleteButton.textContent = 'delete'
  deleteButton.setAttribute('aria-label', `Delete ${habit.habit_label}`)
  deleteButton.addEventListener('click', async () => {
    await deleteHabit(habit, deleteButton)
  })

  const actions = document.createElement('div')
  actions.className = 'detail-actions'
  actions.append(addButton, deleteButton)

  header.append(headingGroup, actions)

  const editForm = createLabelEditForm(habit)

  const stats = document.createElement('dl')
  stats.className = 'detail-stats'
  addDetailStat(stats, 'Times performed', getCountLabel(count))
  addDetailStat(stats, 'Completion marks', getCompletionMarks(count))
  addDetailStat(
    stats,
    'Date and time',
    formatLocalDateTime(habit.time_most_recently_performed_at),
  )

  detail.append(header, editForm, stats)
  habitsDiv.appendChild(detail)
}

function createLabelEditForm(habit) {
  const editForm = document.createElement('form')
  editForm.className = 'label-edit-form'

  const label = createTextElement('label', 'label-edit-label', 'Label')
  label.htmlFor = `habit-label-${habit.id}`

  const input = document.createElement('input')
  input.className = 'label-edit-input'
  input.id = `habit-label-${habit.id}`
  input.name = 'habit-label'
  input.value = habit.habit_label

  const saveButton = document.createElement('button')
  saveButton.className = 'label-save-button'
  saveButton.type = 'submit'
  saveButton.textContent = 'Save'

  editForm.append(label, input, saveButton)

  editForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    await updateHabitLabel(habit, input, saveButton)
  })

  return editForm
}

function addDetailStat(list, label, value) {
  const item = document.createElement('div')
  item.className = 'detail-stat'

  item.append(
    createTextElement('dt', '', label),
    createTextElement('dd', '', value),
  )

  list.appendChild(item)
}

async function loadHabits() {
  habitsDiv.replaceChildren(createTextElement('p', 'empty-state', 'Loading habits...'))

  const { data, error } = await supabase
    .from(HABITS_TABLE)
    .select('id, habit_label, num_times_performed, time_most_recently_performed_at')
    .order('num_times_performed', { ascending: false })

  if (error) {
    habits = []
    showNotice('Error loading habits. Check the console for details.', error)
    return
  }

  habits = data ?? []
  renderApp()
}

async function incrementHabit(habit, button) {
  clearNotice()
  button.disabled = true

  const { error } = await supabase
    .from(HABITS_TABLE)
    .update({
      num_times_performed: (habit.num_times_performed ?? 0) + 1,
      time_most_recently_performed_at: new Date().toISOString(),
    })
    .eq('id', habit.id)

  if (error) {
    button.disabled = false
    showNotice('Could not update that habit. Check the console for details.', error)
    return
  }

  await loadHabits()
}

async function updateHabitLabel(habit, labelInput, button) {
  clearNotice()

  const nextLabel = labelInput.value.trim()

  if (!nextLabel || nextLabel === habit.habit_label) {
    labelInput.value = habit.habit_label
    return
  }

  button.disabled = true
  labelInput.disabled = true

  const { error } = await supabase
    .from(HABITS_TABLE)
    .update({ habit_label: nextLabel })
    .eq('id', habit.id)

  if (error) {
    button.disabled = false
    labelInput.disabled = false
    showNotice('Could not rename that habit. Check the console for details.', error)
    return
  }

  await loadHabits()
}

async function deleteHabit(habit, button) {
  clearNotice()

  const confirmed = window.confirm(`Delete "${habit.habit_label}"?`)

  if (!confirmed) {
    return
  }

  button.disabled = true

  const { error } = await supabase.from(HABITS_TABLE).delete().eq('id', habit.id)

  if (error) {
    button.disabled = false
    showNotice('Could not delete that habit. Check the console for details.', error)
    return
  }

  window.history.replaceState(
    null,
    '',
    `${window.location.pathname}${window.location.search}`,
  )
  await loadHabits()
}

form.addEventListener('submit', async (event) => {
  event.preventDefault()
  clearNotice()

  const habitName = input.value.trim()

  if (!habitName) {
    return
  }

  const { error } = await supabase.from(HABITS_TABLE).insert({
    habit_label: habitName,
    num_times_performed: 0,
    time_most_recently_performed_at: new Date().toISOString(),
    user: PROTOTYPE_USER_ID,
  })

  if (error) {
    showNotice('Could not add that habit. Check the console for details.', error)
    return
  }

  input.value = ''
  await loadHabits()
})

window.addEventListener('popstate', renderApp)
window.addEventListener('hashchange', renderApp)

loadHabits()
